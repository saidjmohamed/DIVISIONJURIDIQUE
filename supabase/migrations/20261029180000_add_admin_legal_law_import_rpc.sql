-- Admin-only Markdown import for the dynamic Algerian legal library.
create or replace function public.admin_import_legal_law(
  p_token uuid, p_law jsonb, p_markdown text, p_articles jsonb, p_publish boolean default false
) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id text; v_title text; v_category text; v_version_id uuid;
  v_version_number integer; v_hash text; v_article_count integer;
begin
  if not exists (select 1 from public.admin_sessions where token = p_token and expires_at > now()) then
    raise exception 'غير مصرح';
  end if;
  if jsonb_typeof(p_law) <> 'object' or jsonb_typeof(p_articles) <> 'array' then
    raise exception 'بيانات القانون غير صالحة';
  end if;
  v_id := nullif(trim(p_law->>'id'), '');
  v_title := nullif(trim(p_law->>'title'), '');
  v_category := nullif(trim(p_law->>'category_slug'), '');
  if v_id is null or v_title is null or coalesce(trim(p_markdown), '') = '' then
    raise exception 'معرف القانون وعنوانه ونص Markdown مطلوبة';
  end if;
  if v_category is not null and not exists (select 1 from public.legal_categories where slug = v_category) then
    v_category := 'أخرى';
  end if;
  v_hash := encode(digest(convert_to(p_markdown, 'UTF8'), 'sha256'), 'hex');
  select id, version_number into v_version_id, v_version_number
  from public.legal_law_versions where law_id = v_id and content_sha256 = v_hash limit 1;
  insert into public.legal_laws (id,title,official_name,law_number,category_slug,icon,color,status,article_count)
  values (v_id,v_title,nullif(p_law->>'official_name',''),nullif(p_law->>'law_number',''),
    coalesce(v_category,'أخرى'),coalesce(nullif(p_law->>'icon',''),'⚖️'),
    coalesce(nullif(p_law->>'color',''),'#2563eb'),'draft',jsonb_array_length(p_articles))
  on conflict (id) do update set title=excluded.title, official_name=excluded.official_name,
    law_number=excluded.law_number, category_slug=excluded.category_slug, icon=excluded.icon,
    color=excluded.color, article_count=excluded.article_count, updated_at=now();
  if v_version_id is null then
    select coalesce(max(version_number),0)+1 into v_version_number
    from public.legal_law_versions where law_id=v_id;
    insert into public.legal_law_versions (law_id,version_number,markdown,content_sha256,change_note,created_by)
    values (v_id,v_version_number,p_markdown,v_hash,'استيراد من مكتبة JSON القديمة','admin')
    returning id into v_version_id;
    insert into public.legal_law_articles (law_id,version_id,article_number,article_order,article_title,article_text,book,chapter)
    select v_id,v_version_id,coalesce(nullif(x->>'article_number',''),x->>'article_order'),
      coalesce((x->>'article_order')::integer,ord::integer),nullif(x->>'article_title',''),
      coalesce(x->>'article_text',''),nullif(x->>'book',''),nullif(x->>'chapter','')
    from jsonb_array_elements(p_articles) with ordinality as t(x,ord)
    where coalesce(x->>'article_text','') <> '';
  end if;
  select count(*)::integer into v_article_count from public.legal_law_articles where version_id=v_version_id;
  if p_publish then
    update public.legal_laws set current_version_id=v_version_id,status='published',
      published_at=coalesce(published_at,now()),article_count=v_article_count,updated_at=now() where id=v_id;
  else
    update public.legal_laws set current_version_id=coalesce(current_version_id,v_version_id),
      article_count=v_article_count,updated_at=now() where id=v_id;
  end if;
  insert into public.legal_audit_logs(law_id,action,details,created_by)
  values(v_id,case when p_publish then 'publish' else 'create' end,
    jsonb_build_object('version',v_version_number,'articles',v_article_count,'sha256',v_hash),'admin');
  return jsonb_build_object('law_id',v_id,'version_id',v_version_id,'version_number',v_version_number,
    'article_count',v_article_count,'status',case when p_publish then 'published' else 'draft' end);
end;
$$;
revoke all on function public.admin_import_legal_law(uuid,jsonb,text,jsonb,boolean) from public;
grant execute on function public.admin_import_legal_law(uuid,jsonb,text,jsonb,boolean) to anon, authenticated;
