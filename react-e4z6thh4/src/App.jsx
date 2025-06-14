import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";


const Card = ({ children, className = "", ...rest }) => (
  <motion.div {...rest} className={`rounded-xl border shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 ${className}`}>
    <div className="p-6">{children}</div>
  </motion.div>
);

const Button = ({ variant = "solid", className = "", ...props }) => {
  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const styles = {
    solid: "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400",
    outline: "border border-gray-300 hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800",
    destructive: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-400",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
};

const FILES = [
  { path: "/single.json", prefix: "s-" },
  { path: "/multi.json", prefix: "m-" },
  { path: "/judge.json", prefix: "j-" },
];

const fallbackQuestions = [
  {
    id: "demo-1",
    chapter: "示例章节",
    text: "这是一个备用单选题示例？",
    options: ["A", "B", "C", "D"],
    answer: 0,
  },
];

const LS_KEY_SCORE = "quiz-score";
const LS_KEY_WRONG_STORE = "quiz-wrong-store"; // 完整错题对象数组

export default function QuizApp() {
  const [questions, setQuestions] = useState([]);
  const [chapter, setChapter] = useState("全部");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState([]);
  const [showAns, setShowAns] = useState(false);
  const [score, setScore] = useState({});
  const [wrongStore, setWrongStore] = useState([]); // 错题本题目对象数组

  // 题库加载与错题本同步
  useEffect(() => {
    Promise.all(
      FILES.map(({ path, prefix }) =>
        fetch(path)
          .then((r) => (r.ok ? r.json() : []))
          .then((arr) => arr.map((q) => ({ ...q, id: `${prefix}${q.id}` })))
          .catch(() => [])
      )
    )
      .then((arr) => arr.flat())
      .then((data) => {
        if (!data.length) data = fallbackQuestions;
        const m = new Map();
        data.forEach((q) => m.set(q.id, q));
        setQuestions(Array.from(m.values()));
      });
    setScore(JSON.parse(localStorage.getItem(LS_KEY_SCORE) || "{}"));
    setWrongStore(JSON.parse(localStorage.getItem(LS_KEY_WRONG_STORE) || "[]"));
  }, []);

  // 章节列表，错题本是独立数据集
  const chapters = [
    "全部",
    ...new Set(questions.map((q) => q.chapter)),
    ...(wrongStore.length ? ["错题本"] : []),
  ];

  // 当前题目池
  const currentList =
    chapter === "全部"
      ? questions
      : chapter === "错题本"
      ? wrongStore
      : questions.filter((q) => q.chapter === chapter);

  const q = currentList[idx] || null;
  const isMulti = q && (q.type === "multi" || Array.isArray(q.answer));
  const isJudge = q && (q.type === "judge" || (!Array.isArray(q.answer) && q.options?.length === 2));

  // 成绩文本
  const getScoreText = (chap) => {
    const s = score[chap] || { correct: 0, total: 0 };
    return `${s.correct}/${s.total}`;
  };

  // 判断答案
  const judgeCorrect = () => {
    if (!q) return false;
    if (isMulti) {
      const setAns = new Set(q.answer);
      return picked.length === setAns.size && picked.every((i) => setAns.has(i));
    }
    return picked.length === 1 && picked[0] === (Array.isArray(q.answer) ? q.answer[0] : q.answer);
  };

  // 选项点击
  const togglePick = (i) => {
    if (showAns) return;
    if (isMulti) setPicked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
    else setPicked([i]);
  };

  // 提交答案
  const handleSubmit = () => {
    if (!q || picked.length === 0) return;
    const right = judgeCorrect();

    setScore((prev) => {
      const next = { ...prev };
      ["全部", q.chapter].forEach((c) => {
        const s = next[c] || { correct: 0, total: 0 };
        next[c] = { correct: s.correct + (right ? 1 : 0), total: s.total + 1 };
      });
      localStorage.setItem(LS_KEY_SCORE, JSON.stringify(next));
      return next;
    });

    if (!right && chapter !== "错题本") {
      // 只有在非错题本页面且做错时才加入错题本
      setWrongStore((prev) => {
        if (prev.find((item) => item.id === q.id)) return prev;
        const arr = [...prev, q];
        localStorage.setItem(LS_KEY_WRONG_STORE, JSON.stringify(arr));
        return arr;
      });
    }

    setShowAns(true);
  };

  // 错题本移除
  const handleRemoveWrong = () => {
    if (!q) return;
    setWrongStore((prev) => {
      const arr = prev.filter((item) => item.id !== q.id);
      localStorage.setItem(LS_KEY_WRONG_STORE, JSON.stringify(arr));
      return arr;
    });
    setPicked([]);
    setShowAns(false);
    setIdx((i) => (i >= currentList.length - 1 ? 0 : i)); // 跳到下题
  };

  const handleNext = () => {
    if (!currentList.length) return;
    setIdx((i) => (i + 1) % currentList.length);
    setPicked([]);
    setShowAns(false);
  };

  if (!q) return <p className="p-8 text-center">题库为空或加载中…</p>;
  const correctSet = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="max-w-2xl mx-auto mt-8">
        <h1 className="text-3xl font-extrabold mb-6 text-center tracking-wide text-blue-700 dark:text-blue-200">银行客服经理刷题</h1>
        {/* 章节按钮栏 */}
        <div className="mb-8 flex justify-center gap-3 flex-wrap overflow-x-auto scrollbar-thin pb-1">
          {chapters.map((c) => (
            <Button
              key={c}
              variant={c === chapter ? "solid" : "outline"}
              onClick={() => {
                setChapter(c);
                setIdx(0);
                setPicked([]);
                setShowAns(false);
              }}
              className="min-w-[90px]"
            >
              {c}
              {c !== "错题本" && c !== "全部" && <span className="text-xs ml-1">({getScoreText(c)})</span>}
            </Button>
          ))}
        </div>
        <div className="text-center text-base mb-4">总成绩：{getScoreText("全部")}（正确 / 总题数）</div>
        {/* 题卡 */}
        <Card initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* 题干 */}
          <p className="mb-6 text-lg font-semibold">
            {idx + 1}/{currentList.length}. {q.text}
            {isMulti && <span className="text-xs text-gray-500 ml-2">（多选）</span>}
            {isJudge && !isMulti && <span className="text-xs text-gray-500 ml-2">（判断）</span>}
          </p>
          {/* 选项列表 */}
          <ul className="space-y-4 mb-6">
            {q.options.map((opt, i) => {
              const selected = picked.includes(i);
              const correct = correctSet.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={showAns && !isMulti}
                    onClick={() => togglePick(i)}
                    className={`w-full flex items-center text-left p-3 rounded-xl border transition-all
                      hover:scale-[1.03] hover:bg-blue-50 dark:hover:bg-zinc-800 shadow-sm
                      ${selected ? "border-blue-500 bg-blue-50 dark:bg-zinc-800 shadow-lg" : "border-gray-200 bg-white"}
                      ${showAns && correct ? "ring-2 ring-green-500" : ""}
                    `}
                  >
                    <span className={`inline-block font-bold mr-2 w-6 h-6 text-center text-blue-600 dark:text-blue-300`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* 答案结果区 */}
          {showAns && (
            <div className="pt-4 border-t text-base text-gray-700 dark:text-gray-300">
              <p className={`font-semibold text-base mb-2 ${judgeCorrect() ? "text-green-600" : "text-red-600"}`}>
                {judgeCorrect() ? "回答正确！" : "回答错误。"} 正确答案：
                {isMulti
                  ? Array.from(correctSet)
                      .map((i) => String.fromCharCode(65 + i))
                      .join(", ")
                  : String.fromCharCode(65 + (Array.isArray(q.answer) ? q.answer[0] : q.answer))}
              </p>
              {q.note && <p className="text-sm mt-1 text-blue-700 dark:text-blue-200">备注：{q.note}</p>}
              {chapter === "错题本" && judgeCorrect() && (
                <Button variant="destructive" className="mt-2" onClick={handleRemoveWrong}>
                  从错题本移除本题
                </Button>
              )}
            </div>
          )}
        </Card>
        {/* 底部提交/下一题 */}
        <div className="mt-8 flex justify-center">
          {!showAns ? (
            <Button disabled={picked.length === 0} onClick={handleSubmit} className="w-full md:w-auto">
              提交
            </Button>
          ) : (
            <Button onClick={handleNext} className="w-full md:w-auto">
              下一题
            </Button>
          )}
        </div>
      </div>
    </div>

  );
}
