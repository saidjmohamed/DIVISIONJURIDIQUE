'use client'

import statsData from "@/data/laws-stats.json"

type StatsStripProps = {
  variant?: "splash" | "about"
}

export default function StatsStrip({ variant = "splash" }: StatsStripProps) {
  const { summary, laws } = statsData
  const totalForDisplay = `+${Math.floor(summary.totalArticles / 500) * 500}`

  // ── نسخة Splash Screen: بسيطة ومدمجة ──
  if (variant === "splash") {
    return (
      <div style={{
        maxWidth: 380, margin: "0 auto",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: "14px 20px",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
      }}>
        {[
          { icon: "📖", n: totalForDisplay, l: "مادة قانونية" },
          { icon: "📚", n: `${summary.totalLaws}`, l: "قانون أساسي" },
          { icon: "📴", n: "%100", l: "مجاني أوفلاين" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{s.icon}</div>
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: "#f0c040", lineHeight: 1.1,
            }}>{s.n}</div>
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.55)",
              marginTop: 3, fontWeight: 500,
            }}>{s.l}</div>
          </div>
        ))}
      </div>
    )
  }

  // ── نسخة About: مفصّلة مع شرائط تقدم ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir="rtl">

      {/* شريط الملخص الكلي */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            icon: "📖",
            value: summary.totalArticles.toLocaleString("ar-DZ"),
            label: "مادة قانونية",
            bg: "#eff6ff",
            color: "#1a3a5c",
          },
          {
            icon: "📚",
            value: `${summary.totalLaws}`,
            label: "قانون (أساسي + آخر)",
            bg: "#f5f3ff",
            color: "#7c3aed",
          },
          {
            icon: "💾",
            value: `${summary.totalSizeMB} MB`,
            label: "حجم البيانات",
            bg: "#f0fdf4",
            color: "#059669",
          },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg,
            border: `1px solid ${s.color}22`,
            borderRadius: 16,
            padding: "14px 10px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{
              fontSize: 20, fontWeight: 900,
              color: s.color, lineHeight: 1.1,
            }}>{s.value}</div>
            <div style={{
              fontSize: 11, color: "#64748b",
              marginTop: 4, fontWeight: 500,
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* قائمة القوانين الأساسية التفصيلية */}
      <h3 style={{
        fontSize: 16, fontWeight: 800,
        color: "#1a3a5c", marginBottom: 12,
      }}>
        📋 القوانين الأساسية السبعة
      </h3>

      <div className="space-y-3">
        {laws.map((law) => {
          const progress = Math.min((law.totalArticles / 1100) * 100, 100)
          return (
            <div key={law.id} style={{
              background: "white",
              border: `1px solid ${law.color}22`,
              borderRight: `4px solid ${law.color}`,
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
              {/* المعلومات */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{law.icon}</span>
                  <div>
                    <p style={{
                      fontWeight: 800, fontSize: 14,
                      color: "#1e293b", margin: 0,
                    }}>
                      {law.shortName}
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: "#94a3b8", marginRight: 6,
                      }}>
                        {law.number}
                      </span>
                    </p>
                    <p style={{
                      fontSize: 11.5, color: "#64748b",
                      margin: "2px 0 0",
                    }}>
                      {law.name}
                    </p>
                  </div>
                </div>

                {/* شريط التقدم */}
                <div style={{
                  marginTop: 8,
                  background: "#f1f5f9",
                  borderRadius: 99, height: 4,
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${law.color}, ${law.color}88)`,
                    borderRadius: 99,
                    transition: "width 1s ease",
                  }} />
                </div>
              </div>

              {/* عدد المواد */}
              <div style={{
                background: `${law.color}11`,
                border: `1px solid ${law.color}33`,
                borderRadius: 12,
                padding: "8px 12px",
                textAlign: "center",
                minWidth: 72,
              }}>
                <p style={{
                  fontSize: 22, fontWeight: 900,
                  color: law.color, margin: 0, lineHeight: 1,
                }}>
                  {law.totalArticles}
                </p>
                <p style={{
                  fontSize: 9.5, color: "#94a3b8",
                  margin: "3px 0 0", fontWeight: 600,
                }}>
                  مادة
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ملخص القوانين الأخرى */}
      {summary.otherLaws > 0 && (
        <div style={{
          marginTop: 20,
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: "16px 20px",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: 14, fontWeight: 700,
            color: "#1e293b", marginBottom: 4,
          }}>
            📂 +{summary.otherLaws} قانون إضافي
          </p>
          <p style={{
            fontSize: 13, color: "#64748b", lineHeight: 1.6,
          }}>
            تشمل: دستور الجمهورية، قوانين العمل والضمان الاجتماعي، الجمارك، الضرائب،
            التعمير، البيئة، الصحة، النقل، الإعلام، الاستثمار وغيرها
          </p>
          <p style={{
            fontSize: 22, fontWeight: 900,
            color: "#7c3aed", marginTop: 8,
          }}>
            {summary.otherArticles.toLocaleString("ar-DZ")} مادة
          </p>
        </div>
      )}

      {/* التحديث الأخير */}
      <p style={{
        fontSize: 11, color: "#94a3b8",
        textAlign: "center", marginTop: 16,
      }}>
        🕐 آخر تحديث للإحصاء: {statsData.generatedAt.split("T")[0]}
      </p>
    </div>
  )
}
