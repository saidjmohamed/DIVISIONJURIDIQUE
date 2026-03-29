'use client'

import { useState, useEffect, useCallback } from "react"

// ── ثوابت التصميم ──
const COLORS = {
  gold: "#f0c040",
  darkBlue: "#1a3a5c",
  white: "#ffffff",
  lightGray: "#f8fafc",
  gray: "#94a3b8",
  darkGray: "#334155",
  border: "#e2e8f0",
  error: "#ef4444",
  success: "#22c55e",
  starEmpty: "#cbd5e1",
  starHover: "#fde68a",
}

const STORAGE_KEY = "shamil:last-rating-timestamp"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ── واجهة الإحصائيات ──
interface RatingStats {
  average: number
  total: number
  distribution: number[]
}

type Phase = "idle" | "rated" | "commenting" | "submitting" | "thankyou" | "cooldown"

export default function StarRating() {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [cooldownDays, setCooldownDays] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // ── جلب الإحصائيات والتحقق من فترة الانتظار عند التحميل ──
  useEffect(() => {
    async function init() {
      try {
        // التحقق من فترة الانتظار المحلية
        const lastRatingStr = localStorage.getItem(STORAGE_KEY)
        if (lastRatingStr) {
          const lastRating = new Date(lastRatingStr).getTime()
          const elapsed = Date.now() - lastRating
          if (elapsed < SEVEN_DAYS_MS) {
            const daysLeft = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))
            setCooldownDays(daysLeft)
            setPhase("cooldown")
          }
        }

        // جلب الإحصائيات
        const res = await fetch("/api/ratings")
        const data = await res.json()
        if (data.success) {
          setStats({
            average: data.average,
            total: data.total,
            distribution: data.distribution,
          })
        }
      } catch {
        // صامت – الإحصائيات اختيارية
      } finally {
        setInitialLoading(false)
      }
    }
    init()
  }, [])

  // ── معالجة النقر على نجمة ──
  const handleStarClick = useCallback((star: number) => {
    if (phase !== "idle") return
    setSelectedRating(star)
    setPhase("commenting")
    setError(null)
  }, [phase])

  // ── إرسال التقييم ──
  const handleSubmit = useCallback(async () => {
    if (selectedRating < 1 || selectedRating > 10) return

    setPhase("submitting")
    setError(null)

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "حدث خطأ أثناء حفظ التقييم")
        setPhase("commenting")
        return
      }

      // تحديث الإحصائيات
      setStats({
        average: data.average,
        total: data.total,
        distribution: data.distribution,
      })

      // حفظ في localStorage
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())

      setPhase("thankyou")
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.")
      setPhase("commenting")
    }
  }, [selectedRating, comment])

  // ── تخطي التعليق ──
  const handleSkipComment = useCallback(() => {
    setComment("")
    handleSubmit()
  }, [handleSubmit])

  // ── حساب عدد النجوم المظللة ──
  const displayValue = hoveredStar ?? selectedRating

  // ── عرض التحميل ──
  if (initialLoading) {
    return (
      <div style={styles.container} dir="rtl">
        <div style={styles.card}>
          <div style={styles.skeletonRow}>
            <div style={{ ...styles.skeleton, width: 120, height: 20 }} />
          </div>
          <div style={{ ...styles.skeletonRow, justifyContent: "center", marginTop: 16 }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{ ...styles.skeleton, width: 28, height: 28, margin: "0 3px", borderRadius: "50%" }} />
            ))}
          </div>
          <div style={styles.skeletonRow}>
            <div style={{ ...styles.skeleton, width: 80, height: 14, marginTop: 12 }} />
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  //  حالة فترة الانتظار
  // ═══════════════════════════════════════
  if (phase === "cooldown") {
    return (
      <div style={styles.container} dir="rtl">
        <div style={styles.card}>
          <p style={styles.title}>⭐ تقييم التطبيق</p>

          {/* شريط متوسط التقييم */}
          {stats && stats.total > 0 && (
            <div style={styles.statsRow}>
              <span style={styles.averageValue}>{stats.average.toFixed(1)}</span>
              <div>
                <div style={styles.starRow}>
                  {renderStaticStars(stats.average)}
                </div>
                <span style={styles.totalText}>{stats.total} تقييم</span>
              </div>
            </div>
          )}

          <div style={styles.cooldownBox}>
            <span style={{ fontSize: 28 }}>⏳</span>
            <p style={styles.cooldownText}>
              لقد قمت بالتقييم مؤخراً
            </p>
            <p style={styles.cooldownSubtext}>
              يمكنك إعادة التقييم بعد {cooldownDays} {cooldownDays === 1 ? "يوم" : "أيام"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  //  حالة الشكر بعد التقييم
  // ═══════════════════════════════════════
  if (phase === "thankyou") {
    return (
      <div style={styles.container} dir="rtl">
        <div style={{ ...styles.card, borderColor: COLORS.gold + "66" }}>
          <p style={{ ...styles.title, color: COLORS.gold }}>🎉 شكراً لتقييمك!</p>

          {/* تقييم المستخدم */}
          <div style={styles.thankyouRating}>
            <span style={styles.thankyouStars}>
              {renderStaticStars(selectedRating)}
            </span>
            <span style={styles.thankyouValue}>{selectedRating}/10</span>
          </div>

          {/* متوسط التقييم العام */}
          {stats && stats.total > 0 && (
            <div style={styles.afterStats}>
              <div style={styles.statsDivider} />
              <p style={styles.afterStatsLabel}>متوسط التقييم العام</p>
              <div style={styles.statsRow}>
                <span style={styles.averageValue}>{stats.average.toFixed(1)}</span>
                <div>
                  <div style={styles.starRow}>
                    {renderStaticStars(stats.average)}
                  </div>
                  <span style={styles.totalText}>{stats.total} تقييم</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  //  الحالة الرئيسية: اختيار التقييم
  // ═══════════════════════════════════════
  return (
    <div style={styles.container} dir="rtl">
      <div style={styles.card}>
        <p style={styles.title}>⭐ قيّم التطبيق</p>
        <p style={styles.subtitle}>
          {phase === "commenting"
            ? "يمكنك إضافة تعليق (اختياري)"
            : "انقر على نجمة للتقييم من 1 إلى 10"}
        </p>

        {/* ── صف النجوم ── */}
        <div style={styles.starsContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
            const isFilled = star <= displayValue
            const isHovered = star === hoveredStar
            return (
              <button
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(null)}
                disabled={phase !== "idle" && phase !== "commenting"}
                style={{
                  ...styles.starButton,
                  cursor: phase === "idle" ? "pointer" : "default",
                  transform: isHovered ? "scale(1.25)" : "scale(1)",
                  opacity: phase === "commenting" && star > selectedRating ? 0.3 : 1,
                }}
                aria-label={`${star} من 10`}
              >
                <span
                  style={{
                    ...styles.starIcon,
                    color: isFilled
                      ? isHovered
                        ? COLORS.starHover
                        : COLORS.gold
                      : COLORS.starEmpty,
                  }}
                >
                  ★
                </span>
              </button>
            )
          })}
        </div>

        {/* رقم التقييم المختار */}
        {selectedRating > 0 && (
          <p style={styles.selectedLabel}>
            تقييمك: <strong style={{ color: COLORS.gold }}>{selectedRating}</strong>/10
          </p>
        )}

        {/* ── منطقة التعليق ── */}
        {phase === "commenting" && (
          <div style={styles.commentSection}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أضف تعليقاً هنا (اختياري)..."
              maxLength={500}
              rows={3}
              style={styles.textarea}
              dir="rtl"
            />
            <p style={styles.charCount}>{comment.length}/500</p>

            {/* خطأ */}
            {error && (
              <p style={styles.errorText}>⚠️ {error}</p>
            )}

            {/* أزرار الإرسال */}
            <div style={styles.buttonsRow}>
              <button onClick={handleSubmit} style={styles.submitButton}>
                ✅ إرسال التقييم
              </button>
              <button onClick={handleSkipComment} style={styles.skipButton}>
                تخطي
              </button>
            </div>
          </div>
        )}

        {/* ── خطأ خارج التعليق ── */}
        {phase === "idle" && error && (
          <p style={styles.errorText}>⚠️ {error}</p>
        )}

        {/* ── متوسط التقييم الحالي ── */}
        {stats && stats.total > 0 && phase === "idle" && (
          <div style={styles.bottomStats}>
            <div style={styles.statsDivider} />
            <div style={styles.statsRow}>
              <span style={styles.averageValue}>{stats.average.toFixed(1)}</span>
              <div>
                <div style={styles.starRow}>
                  {renderStaticStars(stats.average)}
                </div>
                <span style={styles.totalText}>{stats.total} تقييم</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── نجوم ثابتة للعرض (متوسط التقييم) ──
function renderStaticStars(average: number) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
    <span
      key={i}
      style={{
        ...styles.starIconSmall,
        color: i <= Math.round(average) ? COLORS.gold : COLORS.starEmpty,
      }}
    >
      ★
    </span>
  ))
}

// ═══════════════════════════════════════
//  أنماط CSS المضمنة (inline styles)
// ═══════════════════════════════════════
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "20px 16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif',
  },
  card: {
    background: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "24px 28px",
    width: "100%",
    maxWidth: 420,
    textAlign: "center" as const,
    boxShadow: "0 4px 24px rgba(26, 58, 92, 0.08)",
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: COLORS.darkBlue,
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray,
    margin: "0 0 16px",
  },

  // النجوم التفاعلية
  starsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
    direction: "ltr" as const,
  },
  starButton: {
    background: "none",
    border: "none",
    padding: 2,
    outline: "none",
    transition: "transform 0.15s ease",
    lineHeight: 1,
  },
  starIcon: {
    fontSize: 30,
    lineHeight: 1,
    transition: "color 0.15s ease",
  },
  starIconSmall: {
    fontSize: 16,
    lineHeight: 1,
  },
  selectedLabel: {
    fontSize: 14,
    color: COLORS.darkGray,
    margin: "4px 0 12px",
  },

  // منطقة التعليق
  commentSection: {
    marginTop: 12,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 14px",
    fontSize: 14,
    fontFamily: 'inherit, "Noto Sans Arabic", sans-serif',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    resize: "none" as const,
    outline: "none",
    color: COLORS.darkGray,
    background: COLORS.lightGray,
    transition: "border-color 0.2s",
  },
  charCount: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "left" as const,
    margin: "4px 0 0",
  },

  // الأزرار
  buttonsRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
    justifyContent: "center",
  },
  submitButton: {
    background: COLORS.darkBlue,
    color: COLORS.white,
    border: "none",
    borderRadius: 12,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
    fontFamily: 'inherit, "Noto Sans Arabic", sans-serif',
  },
  skipButton: {
    background: "none",
    color: COLORS.gray,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
    fontFamily: 'inherit, "Noto Sans Arabic", sans-serif',
  },

  // الخطأ
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    margin: "8px 0 0",
    fontWeight: 600,
  },

  // حالة الشكر
  thankyouRating: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    margin: "12px 0",
  },
  thankyouStars: {
    direction: "ltr" as const,
    display: "inline-flex",
  },
  thankyouValue: {
    fontSize: 18,
    fontWeight: 900,
    color: COLORS.darkBlue,
  },

  // الإحصائيات
  statsDivider: {
    height: 1,
    background: COLORS.border,
    margin: "16px 0 12px",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  averageValue: {
    fontSize: 36,
    fontWeight: 900,
    color: COLORS.darkBlue,
    lineHeight: 1,
  },
  starRow: {
    display: "flex",
    gap: 1,
    direction: "ltr" as const,
    marginBottom: 2,
  },
  totalText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: 500,
  },
  bottomStats: {
    marginTop: 8,
  },
  afterStats: {
    marginTop: 4,
  },
  afterStatsLabel: {
    fontSize: 12,
    color: COLORS.gray,
    margin: "0 0 8px",
    fontWeight: 600,
  },

  // حالة الانتظار
  cooldownBox: {
    background: `linear-gradient(135deg, ${COLORS.lightGray}, #eef2ff)`,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "20px",
    marginTop: 12,
  },
  cooldownText: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.darkBlue,
    margin: "8px 0 4px",
  },
  cooldownSubtext: {
    fontSize: 13,
    color: COLORS.gray,
    margin: 0,
  },

  // هيكل التحميل
  skeletonRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  skeleton: {
    background: `linear-gradient(90deg, ${COLORS.border} 25%, #f1f5f9 50%, ${COLORS.border} 75%)`,
    backgroundSize: "200% 100%",
    borderRadius: 8,
    animation: "shimmer 1.5s infinite",
  },
}
