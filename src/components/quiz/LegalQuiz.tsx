"use client"

import { useQuiz } from "@/hooks/useQuiz"

export default function LegalQuiz() {
  const quiz = useQuiz()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir="rtl">

      {/* ━━━━━━━━━ شاشة البداية ━━━━━━━━━ */}
      {quiz.state === "idle" && (
        <div className="space-y-6">
          <div className="text-center">
            <span className="text-7xl block mb-4">⚖️</span>
            <h2 className="text-2xl font-bold text-[#1a3a5c]">
              اختبار الثقافة القانونية
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              اختبر معلوماتك في القانون الجزائري
            </p>
          </div>

          {/* بطاقة المعلومات */}
          <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8a] rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-bold">40 سؤالاً قانونياً</p>
                <p className="text-xs text-white/70">من ق.إ.ج وق.إ.م.إ</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white/20 rounded-lg p-2">
                <p className="font-bold">🟢 سهل</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2">
                <p className="font-bold">🟡 متوسط</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2">
                <p className="font-bold">🔴 صعب</p>
              </div>
            </div>
          </div>

          {/* اختيار القانون */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              📖 القانون
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "all", label: "الكل" },
                { value: "qij", label: "ق.إ.ج" },
                { value: "qima", label: "ق.إ.م.إ" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => quiz.setMode(opt.value as "all" | "qij" | "qima")}
                  className={`py-3 rounded-xl text-sm font-medium transition-all
                    ${quiz.mode === opt.value
                      ? "bg-[#1a3a5c] text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* اختيار المستوى */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              📊 المستوى
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "all", label: "الكل", bg: "bg-gray-100", text: "text-gray-600" },
                { value: "easy", label: "🟢 سهل", bg: "bg-green-50", text: "text-green-700" },
                { value: "medium", label: "🟡 متوسط", bg: "bg-amber-50", text: "text-amber-700" },
                { value: "hard", label: "🔴 صعب", bg: "bg-red-50", text: "text-red-700" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => quiz.setDifficulty(opt.value as "all" | "easy" | "medium" | "hard")}
                  className={`py-2.5 rounded-xl text-xs font-medium transition-all border-2
                    ${quiz.difficulty === opt.value
                      ? `border-[#1a3a5c] ${opt.bg} ${opt.text} scale-105`
                      : `border-transparent ${opt.bg} ${opt.text} hover:scale-102`
                    }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={quiz.startQuiz}
            className="w-full py-4 bg-gradient-to-l from-[#1a3a5c] to-[#2d5a8a] text-white
                       rounded-2xl font-bold text-lg hover:from-[#2d5a8a] hover:to-[#1a3a5c]
                       transition-all shadow-lg hover:shadow-xl active:scale-98">
            🚀 ابدأ الاختبار
          </button>
        </div>
      )}

      {/* ━━━━━━━━━ شاشة السؤال ━━━━━━━━━ */}
      {(quiz.state === "playing" || quiz.state === "answered") && quiz.currentQuestion && (
        <div className="space-y-5">

          {/* شريط التقدم */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">السؤال {quiz.currentIndex + 1} من {quiz.questions.length}</span>
              <span className="text-green-600 font-bold">✅ {quiz.score} صحيح</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-l from-[#1a3a5c] to-[#c9a84c] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${quiz.progress}%` }}
              />
            </div>
          </div>

          {/* بادج القانون والصعوبة والفئة */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full font-bold
              ${quiz.currentQuestion.law === "qij"
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-green-100 text-green-700 border border-green-200"}`}>
              {quiz.currentQuestion.law === "qij" ? "📖 ق.إ.ج" : "📖 ق.إ.م.إ"}
            </span>
            <span className={`text-xs px-3 py-1.5 rounded-full font-bold
              ${quiz.currentQuestion.difficulty === "easy"
                ? "bg-green-100 text-green-700 border border-green-200"
                : quiz.currentQuestion.difficulty === "medium"
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-red-100 text-red-700 border border-red-200"}`}>
              {quiz.currentQuestion.difficulty === "easy" ? "🟢 سهل"
               : quiz.currentQuestion.difficulty === "medium" ? "🟡 متوسط"
               : "🔴 صعب"}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full font-medium
                             bg-gray-100 text-gray-600 border border-gray-200">
              {quiz.currentQuestion.category}
            </span>
          </div>

          {/* السؤال */}
          <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8a] text-white rounded-2xl p-5 shadow-lg">
            <p className="text-lg font-bold leading-relaxed">
              {quiz.currentQuestion.question}
            </p>
          </div>

          {/* الخيارات */}
          <div className="space-y-3">
            {quiz.currentQuestion.options.map((option, i) => {
              const isCorrect = i === quiz.currentQuestion!.correct
              const isSelected = i === quiz.selectedAnswer
              const answered = quiz.state === "answered"

              let style = "bg-white border-2 border-gray-200 text-gray-800 hover:border-[#1a3a5c] hover:bg-blue-50"

              if (answered) {
                if (isCorrect) {
                  style = "bg-green-50 border-2 border-green-500 text-green-800 shadow-md"
                } else if (isSelected && !isCorrect) {
                  style = "bg-red-50 border-2 border-red-500 text-red-800"
                } else {
                  style = "bg-gray-50 border-2 border-gray-200 text-gray-500"
                }
              } else if (isSelected) {
                style = "bg-blue-50 border-2 border-blue-500 text-blue-800"
              }

              return (
                <button
                  key={i}
                  onClick={() => quiz.answerQuestion(i)}
                  disabled={answered}
                  className={`w-full p-4 rounded-xl text-right transition-all font-medium ${style}`}>
                  <span className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center
                                     text-sm font-bold shrink-0 transition-colors
                                     ${answered && isCorrect
                                       ? "bg-green-500 text-white"
                                       : answered && isSelected && !isCorrect
                                       ? "bg-red-500 text-white"
                                       : "bg-gray-100 text-gray-600"}`}>
                      {["أ", "ب", "ج", "د"][i]}
                    </span>
                    <span className="flex-1">{option}</span>
                    {answered && isCorrect && (
                      <span className="text-green-500 text-xl">✅</span>
                    )}
                    {answered && isSelected && !isCorrect && (
                      <span className="text-red-500 text-xl">❌</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* الشرح بعد الإجابة */}
          {quiz.state === "answered" && (
            <div className={`rounded-2xl p-4 border-r-4 shadow-md animate-fade-in
              ${quiz.selectedAnswer === quiz.currentQuestion.correct
                ? "bg-green-50 border-green-500"
                : "bg-red-50 border-red-500"}`}>
              <p className="font-bold text-gray-800 mb-2 text-lg">
                {quiz.selectedAnswer === quiz.currentQuestion.correct
                  ? "✅ إجابة صحيحة! أحسنت!" : "❌ إجابة خاطئة"}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {quiz.currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* زر التالي */}
          {quiz.state === "answered" && (
            <button
              onClick={quiz.nextQuestion}
              className="w-full py-4 bg-gradient-to-l from-[#1a3a5c] to-[#2d5a8a] text-white
                         rounded-xl font-bold text-lg hover:from-[#2d5a8a] hover:to-[#1a3a5c]
                         transition-all shadow-lg active:scale-98">
              {quiz.currentIndex + 1 >= quiz.questions.length
                ? "🏆 عرض النتيجة"
                : "السؤال التالي ➤"}
            </button>
          )}
        </div>
      )}

      {/* ━━━━━━━━━ شاشة النتيجة ━━━━━━━━━ */}
      {quiz.state === "finished" && (
        <div className="text-center space-y-6 animate-fade-in">

          <div className="text-8xl mb-2">
            {quiz.scorePercent >= 80 ? "🏆"
             : quiz.scorePercent >= 60 ? "🥈"
             : quiz.scorePercent >= 40 ? "🥉" : "📚"}
          </div>

          <div>
            <h3 className="text-3xl font-black text-[#1a3a5c]">
              {quiz.score} / {quiz.questions.length}
            </h3>
            <p className="text-6xl font-black mt-2" style={{
              color: quiz.scorePercent >= 80 ? "#16a34a"
                   : quiz.scorePercent >= 60 ? "#d97706" : "#dc2626"
            }}>
              {quiz.scorePercent}%
            </p>
          </div>

          {/* تقييم */}
          <div className={`rounded-2xl p-5 text-center shadow-md
            ${quiz.scorePercent >= 80
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
              : quiz.scorePercent >= 60
              ? "bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200"
              : "bg-gradient-to-br from-red-50 to-pink-50 border border-red-200"}`}>
            <p className="font-bold text-xl">
              {quiz.scorePercent >= 80 ? "🌟 ممتاز! أنت خبير قانوني!"
               : quiz.scorePercent >= 60 ? "👍 جيد! تحتاج مراجعة بسيطة"
               : quiz.scorePercent >= 40 ? "📖 راجع القوانين وأعد المحاولة"
               : "💪 لا بأس! التعلم يحتاج وقتاً"}
            </p>
          </div>

          {/* ملخص النتيجة */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <p className="text-3xl font-black text-green-600">
                {quiz.score}
              </p>
              <p className="text-xs text-gray-600 font-medium">صحيح ✅</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
              <p className="text-3xl font-black text-red-600">
                {quiz.questions.length - quiz.score}
              </p>
              <p className="text-xs text-gray-600 font-medium">خاطئ ❌</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <p className="text-3xl font-black text-blue-600">
                {quiz.questions.length}
              </p>
              <p className="text-xs text-gray-600 font-medium">إجمالي 📝</p>
            </div>
          </div>

          {/* نصيحة */}
          {quiz.scorePercent < 60 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm text-amber-800">
                💡 <strong>نصيحة:</strong> راجع قانون الإجراءات الجزائية والمدنية،
                وركز على آجال الطعن والاختصاصات القضائية.
              </p>
            </div>
          )}

          {/* أزرار */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={quiz.startQuiz}
              className="py-4 bg-gradient-to-l from-[#1a3a5c] to-[#2d5a8a] text-white rounded-xl
                         font-bold text-lg hover:from-[#2d5a8a] hover:to-[#1a3a5c]
                         transition-all shadow-lg active:scale-98">
              🔄 إعادة المحاولة
            </button>
            <button
              onClick={quiz.reset}
              className="py-4 bg-gray-100 text-gray-700 rounded-xl
                         font-bold text-lg hover:bg-gray-200 transition-all active:scale-98">
              ⚙️ تغيير الإعدادات
            </button>
          </div>
        </div>
      )}


    </div>
  )
}
