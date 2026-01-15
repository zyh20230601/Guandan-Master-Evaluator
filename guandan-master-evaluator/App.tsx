
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Card, HandArrangement, Combo, ScoreDetail, Suit } from './types';
import { generateDeck, shuffle, deal, sortHand } from './utils/cardUtils';
import { findTopArrangements, identifyCombo, solveHand, calculateFullScoreInfo, solveRemaining } from './utils/scoringLogic';
import CardView from './components/CardView';
import ComboGroup from './components/ComboGroup';

const App: React.FC = () => {
  const [levelRank, setLevelRank] = useState<number>(2);
  const [currentHand, setCurrentHand] = useState<Card[]>([]);
  const [topArrangements, setTopArrangements] = useState<HandArrangement[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showStandards, setShowStandards] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importString, setImportString] = useState('');
  const [showAiResults, setShowAiResults] = useState(false); // 控制 AI 方案显隐的状态

  // 手动组牌状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manualCombos, setManualCombos] = useState<Combo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 选中的 AI 方案索引
  const [selectedAiIndex, setSelectedAiIndex] = useState<number | null>(null);

  // 引用以便滚动或触发文件选择
  const aiResultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化或发牌
  const handleDeal = useCallback(() => {
    setIsCalculating(true);
    setTopArrangements([]);
    setSelectedIds(new Set());
    setManualCombos([]);
    setErrorMessage(null);
    setSelectedAiIndex(null);
    setShowAiResults(false); // 重新发牌后默认隐藏
    
    const deck = generateDeck(levelRank);
    const shuffled = shuffle(deck);
    const hands = deal(shuffled);
    const myHand = sortHand(hands[0]);
    setCurrentHand(myHand);

    setTimeout(() => {
      const best = findTopArrangements(myHand, 5);
      setTopArrangements(best);
      setIsCalculating(false);
    }, 1200);
  }, [levelRank]);

  // 解析并导入字符串手牌
  const handleImportString = () => {
    const suitMap: Record<string, Suit> = {
      'S': 'Spades', 'H': 'Hearts', 'D': 'Diamonds', 'C': 'Clubs', 'J': 'Joker'
    };
    const rankMap: Record<string, number> = {
      '1': 14, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    const words = importString.trim().split(/\s+/).filter(w => w.length >= 2);
    
    if (words.length !== 27) {
      setErrorMessage(`解析失败：需要27张牌，当前检测到 ${words.length} 张`);
      return;
    }

    try {
      const importedHand: Card[] = words.map((word, index) => {
        const sChar = word[0].toUpperCase();
        const rPart = word.substring(1).toUpperCase();
        
        const suit = suitMap[sChar];
        if (!suit) throw new Error(`第 ${index+1} 张牌花色错误: ${sChar}`);

        let originalRank: number;
        let displayRank: string;

        if (suit === 'Joker') {
          originalRank = rPart === '0' ? 17 : 16;
          displayRank = rPart === '0' ? 'RJ' : 'BJ';
        } else {
          if (rPart === '10' || rPart === 'T') {
            originalRank = 10;
            displayRank = '10';
          } else {
            originalRank = rankMap[rPart] || parseInt(rPart);
            if (isNaN(originalRank)) throw new Error(`第 ${index+1} 张牌点数错误: ${rPart}`);
            displayRank = rPart === '1' || rPart === 'A' ? 'A' : rPart;
          }
        }

        let rank = originalRank;
        if (originalRank === levelRank && suit !== 'Joker') {
          rank = 15;
        }

        return {
          id: Math.random().toString(36).substr(2, 9),
          suit,
          rank,
          originalRank,
          displayRank,
          isMagic: (suit === 'Hearts' && rank === 15)
        };
      });

      const sorted = sortHand(importedHand);
      setCurrentHand(sorted);
      setManualCombos([]);
      setSelectedIds(new Set());
      setSelectedAiIndex(null);
      setErrorMessage(null);
      setShowImportModal(false);
      setImportString('');
      setShowAiResults(false); // 导入后默认隐藏

      setIsCalculating(true);
      setTimeout(() => {
        const best = findTopArrangements(sorted, 5);
        setTopArrangements(best);
        setIsCalculating(false);
      }, 1000);

    } catch (err: any) {
      setErrorMessage(`解析错误: ${err.message}`);
    }
  };

  // 保存当前方案到 TXT
  const handleSave = () => {
    if (currentHand.length === 0 && manualCombos.length === 0) {
      setErrorMessage("没有可保存的牌局");
      return;
    }

    const restArrangement = solveRemaining(currentHand, manualCombos);
    
    const saveData = {
      version: "5.5",
      levelRank,
      currentHand,
      manualCombos,
      arrangement: restArrangement,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guandan_save_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 读取 TXT 方案
  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.currentHand && Array.isArray(data.currentHand)) {
          const loadedLevelRank = data.levelRank || 2;
          setLevelRank(loadedLevelRank);
          
          const savedManualCombos = data.manualCombos || [];
          const savedRemainingHand = data.currentHand || [];
          const fullHand = sortHand([...savedRemainingHand, ...savedManualCombos.flatMap((c: Combo) => c.cards)]);
          
          if (fullHand.length !== 27) {
            console.warn("读取的手牌总数不等于27张，可能会影响评估精度");
          }

          let loadedArrangement: HandArrangement;
          if (data.arrangement) {
            loadedArrangement = data.arrangement;
          } else {
            loadedArrangement = solveRemaining(savedRemainingHand, savedManualCombos);
          }

          setIsCalculating(true);
          setErrorMessage(null);
          setShowAiResults(false); // 读取后默认隐藏

          setTimeout(() => {
            const aiArrangements = findTopArrangements(fullHand, 10);
            const merged = [loadedArrangement, ...aiArrangements]
              .sort((a, b) => b.score - a.score)
              .filter((v, i, a) => {
                const key = v.combos.map(c => `${c.type}-${c.power}-${c.cards.length}`).sort().join('|');
                return a.findIndex(t => {
                   const tKey = t.combos.map(tc => `${tc.type}-${tc.power}-${tc.cards.length}`).sort().join('|');
                   return tKey === key;
                }) === i;
              })
              .slice(0, 5);

            setTopArrangements(merged);
            
            setCurrentHand(fullHand);
            setManualCombos([]);
            setSelectedIds(new Set());
            setSelectedAiIndex(null);
            
            setIsCalculating(false);
          }, 1000);

        } else {
          setErrorMessage("文件格式不正确");
        }
      } catch (err) {
        setErrorMessage("读取文件失败，请确保是有效的 TXT 方案文件");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 按点数分组手牌
  const groupedHand = useMemo(() => {
    const magicCards = currentHand.filter(c => c.isMagic);
    const nonMagicCards = currentHand.filter(c => !c.isMagic);
    
    const groupsMap: Map<number, Card[]> = new Map();
    nonMagicCards.forEach(card => {
      const list = groupsMap.get(card.rank) || [];
      list.push(card);
      groupsMap.set(card.rank, list);
    });
    
    const result = Array.from(groupsMap.values());
    if (magicCards.length > 0) {
      result.unshift(magicCards);
    }
    return result;
  }, [currentHand]);

  // 处理扑克牌选中
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
    setErrorMessage(null);
  };

  // 手动理出一组牌
  const handleGroup = () => {
    if (selectedIds.size === 0) return;
    
    const selectedCards = currentHand.filter(c => selectedIds.has(c.id));
    const combo = identifyCombo(selectedCards);

    if (combo) {
      setManualCombos([...manualCombos, combo]);
      const remainingHand = currentHand.filter(c => !selectedIds.has(c.id));
      setCurrentHand(remainingHand);
      setSelectedIds(new Set());
      setErrorMessage(null);
      setSelectedAiIndex(null);
    } else {
      setErrorMessage("无效组合");
    }
  };

  // 撤销/取消某一个组合
  const handleRemoveCombo = (index: number) => {
    let sourceCombos = [...manualCombos];
    
    if (selectedAiIndex !== null && topArrangements[selectedAiIndex]) {
      sourceCombos = [...topArrangements[selectedAiIndex].combos];
      setSelectedAiIndex(null);
    }

    const comboToRemove = sourceCombos[index];
    if (!comboToRemove) return;

    sourceCombos.splice(index, 1);
    const updatedHand = sortHand([...currentHand, ...comboToRemove.cards]);
    
    setManualCombos(sourceCombos);
    setCurrentHand(updatedHand);
    setErrorMessage(null);
  };

  // 撤销/重置手动组牌
  const handleResetManual = () => {
    const allCards = [...currentHand];
    manualCombos.forEach(c => allCards.push(...c.cards));
    setCurrentHand(sortHand(allCards));
    setManualCombos([]);
    setSelectedIds(new Set());
    setErrorMessage(null);
    setSelectedAiIndex(null);
  };

  // 载入 AI 方案
  const applyAiStrategy = (idx: number) => {
    const arr = topArrangements[idx];
    if (!arr) return;
    
    setCurrentHand([]); 
    setManualCombos(arr.combos);
    setSelectedIds(new Set());
    setSelectedAiIndex(idx);
    setErrorMessage(null);
  };

  // 预期总分
  const manualScoreData = useMemo(() => {
    if (manualCombos.length === 0 && currentHand.length === 27) return null;
    if (selectedAiIndex !== null && topArrangements[selectedAiIndex]) {
      return {
        score: topArrangements[selectedAiIndex].score,
        totalCombos: topArrangements[selectedAiIndex].combos,
        breakdown: topArrangements[selectedAiIndex].scoreBreakdown
      };
    }
    const restArrangement = solveRemaining(currentHand, manualCombos);
    const { score, breakdown } = calculateFullScoreInfo(restArrangement.combos);
    return {
      score,
      totalCombos: restArrangement.combos,
      breakdown
    };
  }, [manualCombos, currentHand, selectedAiIndex, topArrangements]);

  const getEvaluationTags = (score: number, combos: Combo[]) => {
    const bombCount = combos.filter(c => c.type.includes('炸') || c.type.includes('天王') || c.type.includes('顺')).length;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-green-500/50 text-green-400 bg-green-500/10 whitespace-nowrap">
          {combos.length}手
        </span>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-red-500/50 text-red-400 bg-red-500/10 whitespace-nowrap">
          火力:{bombCount}
        </span>
      </div>
    );
  };

  const renderBreakdown = (breakdown: ScoreDetail[]) => {
    return (
      <div className="flex flex-wrap gap-1 mt-4">
        {breakdown.map((item, i) => (
          <div key={i} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold border ${
            item.value > 0 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : item.value < 0 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
          } whitespace-nowrap`}>
            <span>{item.label}</span>
            <span className="opacity-80">{item.value > 0 ? `+${item.value}` : item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4 min-h-screen text-slate-100 bg-[#063323] overflow-x-hidden select-none relative">
      <input 
        type="file" 
        accept=".txt" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleLoad} 
      />

      {/* 评分标准模态框 */}
      {showStandards && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowStandards(false)}></div>
          <div className="relative bg-[#0d4d36] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white">掼蛋核心评分细则 (v5.5)</h3>
                <p className="text-[10px] text-green-300/40 uppercase tracking-widest font-bold">Latest Scoring Rules</p>
              </div>
              <button 
                onClick={() => setShowStandards(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-300">基础分 & 手数</span>
                    <span className="text-xs font-black text-yellow-500/80">20 基准 / -1 (仅非炸弹)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">初始 20 分。每理出一手“非炸弹”组合扣减 1 分。炸弹属于“免费”手牌。</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-300">核心火力</span>
                    <span className="text-xs font-black text-green-400">+2 ~ +4 (额外加分)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">四大天王 +4；同花顺或 6 张及以上炸弹 +3；常规炸弹 +2。</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-300">王牌奖励</span>
                    <span className="text-xs font-black text-red-400">+1 / 项</span>
                  </div>
                  <p className="text-[10px] text-slate-500">每张大王 +1；拥有 2 个小王（黑王）额外 +1。</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-300">强力组合奖励 (封顶加分)</span>
                    <span className="text-xs font-black text-blue-400">+1 / 组</span>
                  </div>
                  <p className="text-[10px] text-slate-500">钢板(≥6)、三连对(≥8)按组加分。高位顺子(≥级牌)、高位三带二(≥级牌)无论多少组，各类别封顶仅加 1 分。注意：10-J-Q-K-A 不计为高位顺子。</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-300">散牌惩罚</span>
                    <span className="text-xs font-black text-red-500">-1 / 手</span>
                  </div>
                  <p className="text-[10px] text-slate-500">8 点以下单张、6 点以下对子每手额外扣减 1 分。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导入字符串模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowImportModal(false)}></div>
          <div className="relative bg-[#0d4d36] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white">导入字符串手牌</h3>
                <p className="text-[10px] text-green-300/40 uppercase tracking-widest font-bold">Import via encoded string</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-white/40 hover:text-white transition-all">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-[10px] text-slate-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                <p className="font-bold text-slate-300 mb-1">格式说明:</p>
                <p>27个词，空格隔开。2-3字符词: [花色][点数]</p>
                <p>花色: S(黑桃) H(红心) D(方块) C(梅花) J(王)</p>
                <p>点数: 1(A), 2-9, 10或T, J, Q, K | 大王: J0, 小王: J1</p>
              </div>
              {errorMessage && (
                <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl">
                   <p className="text-red-400 text-xs font-bold animate-pulse">{errorMessage}</p>
                </div>
              )}
              <textarea 
                value={importString}
                onChange={(e) => setImportString(e.target.value)}
                placeholder="在此粘贴27张牌的字符串..."
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-white/10 text-white"
              />
              <button 
                onClick={handleImportString}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-black text-sm transition-all shadow-lg uppercase tracking-widest"
              >
                开始解析并导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/30 p-4 rounded-xl border border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🃏</div>
          <div>
            <h1 className="text-xl font-black text-white">掼蛋大师 v5.5</h1>
            <p className="text-green-300/40 text-[9px] font-bold tracking-widest uppercase">Intelligent Scoring & Comparison</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          <div className="bg-black/40 px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
            <span className="text-[8px] font-bold text-slate-500 uppercase">打级</span>
            <select 
              value={levelRank} 
              onChange={(e) => setLevelRank(Number(e.target.value))}
              className="bg-transparent text-yellow-400 font-black outline-none cursor-pointer text-base"
            >
              {[2,3,4,5,6,7,8,9,10,11,12,13,14].map(r => (
                <option key={r} value={r} className="bg-slate-900 text-white">
                  {r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : r === 14 ? 'A' : r}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setErrorMessage(null);
                setShowImportModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-black text-[10px] transition-all uppercase tracking-tighter"
            >
              📝 字符串
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg font-black text-[10px] transition-all uppercase tracking-tighter"
            >
              📂 读取
            </button>
            <button 
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg font-black text-[10px] transition-all uppercase tracking-tighter"
            >
              💾 保存
            </button>
            <button 
              onClick={handleDeal}
              disabled={isCalculating}
              className="bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 disabled:from-slate-800 text-white px-4 py-2 rounded-lg font-black text-[10px] transition-all shadow-md uppercase"
            >
              {isCalculating ? "分析中..." : "重新发牌"}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 手牌区 */}
        <div className="lg:col-span-12 flex flex-col gap-4">
          <section className="bg-black/20 p-4 rounded-2xl border border-white/5 relative shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-white italic opacity-80">
                持有牌 ({currentHand.length})
                {selectedAiIndex !== null && <span className="ml-3 text-[10px] text-yellow-400 not-italic bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 whitespace-nowrap">正在查看方案 #{selectedAiIndex + 1}</span>}
              </h2>
              <div className="flex gap-2">
                 {errorMessage && <span className="text-red-400 text-[9px] font-bold self-center mr-2 animate-pulse">{errorMessage}</span>}
                 <button 
                  onClick={handleGroup}
                  disabled={selectedIds.size === 0}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 text-slate-900 px-4 py-1.5 rounded-md text-xs font-black transition-all"
                 >
                   组合({selectedIds.size})
                 </button>
                 <button 
                  onClick={handleResetManual}
                  className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-md text-xs font-bold border border-white/10"
                 >
                   重置/整理
                 </button>
              </div>
            </div>

            <div className="flex flex-row flex-nowrap gap-1.5 justify-center items-start overflow-hidden py-2 min-h-[160px]">
              {groupedHand.length > 0 ? (
                groupedHand.map((group, groupIdx) => (
                  <div key={groupIdx} className="flex flex-col gap-0.5 shrink-0">
                    <div className="text-[8px] font-black text-white/20 text-center mb-0.5 uppercase whitespace-nowrap">
                      {group[0].displayRank}
                    </div>
                    {group.map((card) => (
                      <CardView 
                        key={card.id} 
                        card={card} 
                        size="md" 
                        selected={selectedIds.has(card.id)}
                        onClick={() => toggleSelect(card.id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-white/20 text-xs italic gap-2">
                  <div className="text-4xl">✅</div>
                  {selectedAiIndex !== null ? "方案已完整展示" : "理牌已完成"}
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 推演板 */}
            <div className="md:col-span-2 bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {selectedAiIndex !== null ? `组牌序列 (方案 #${selectedAiIndex+1})` : "当前组牌序列"}
                </h3>
                {selectedAiIndex !== null && (
                  <button onClick={() => setSelectedAiIndex(null)} className="text-[8px] bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-0.5 rounded transition-all font-bold whitespace-nowrap">退出预览</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 content-start min-h-[120px]">
                {(selectedAiIndex !== null ? topArrangements[selectedAiIndex]?.combos : manualCombos).map((combo, idx) => (
                  <ComboGroup 
                    key={idx} 
                    combo={combo} 
                    onRemove={() => handleRemoveCombo(idx)}
                  />
                ))}
                {manualCombos.length === 0 && selectedAiIndex === null && (
                  <div className="text-white/10 text-xs py-4 w-full text-center italic">暂无序列，请从上方选牌组合...</div>
                )}
              </div>
              {manualScoreData?.breakdown && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h4 className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-tighter">得分构成明细 (实时)</h4>
                  {renderBreakdown(manualScoreData.breakdown)}
                </div>
              )}
            </div>
            
            {/* 战力面板 */}
            <div className="bg-gradient-to-br from-yellow-600 to-amber-900 p-6 rounded-2xl shadow-xl flex flex-col justify-center relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <div className="text-6xl font-black">AI</div>
               </div>
               <h3 className="text-[9px] font-black text-white/60 uppercase mb-2 tracking-widest whitespace-nowrap">
                 综合评估战力
               </h3>
               {manualScoreData ? (
                 <>
                   <div className="flex items-baseline gap-2">
                     <span className="text-5xl font-black text-white tracking-tighter">{manualScoreData.score}</span>
                     <span className="text-[10px] text-white/40 font-bold uppercase whitespace-nowrap">Points</span>
                   </div>
                   {getEvaluationTags(manualScoreData.score, manualScoreData.totalCombos)}
                   <button 
                    onClick={() => setShowStandards(true)}
                    className="mt-6 flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white/80 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                   >
                     <span>📊</span> 评分标准详情
                   </button>
                 </>
               ) : (
                 <div className="flex flex-col gap-4">
                   <span className="text-xl font-bold text-white/20 italic">等待数据分析...</span>
                   <button 
                    onClick={() => setShowStandards(true)}
                    className="flex items-center justify-center gap-2 w-full bg-white/5 text-white/20 py-2.5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest cursor-default whitespace-nowrap"
                   >
                     查看计分规则
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* 最佳战术图谱区域入口 */}
      <section className="mt-8 pt-4 border-t border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-sm font-black text-white/60 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
            最佳战术图谱 
          </h2>
          <button 
            onClick={() => setShowAiResults(!showAiResults)}
            className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border ${
              showAiResults 
                ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' 
                : 'bg-green-600 text-white border-green-500 hover:bg-green-500'
            }`}
          >
            {showAiResults ? '隐藏' : '显示'}
          </button>
          {!showAiResults && (
            <span className="text-[8px] text-slate-500 italic">点击“显示”查看系统分析的最佳方案</span>
          )}
        </div>

        {showAiResults && (
          <>
            {/* 方案摘要列表 */}
            <div className="flex flex-row gap-4 pb-4 overflow-x-auto custom-scrollbar">
              {topArrangements.map((arr, idx) => (
                <div 
                  key={idx} 
                  className={`min-w-[280px] rounded-xl p-4 border transition-all cursor-pointer transform active:scale-95 ${
                    selectedAiIndex === idx 
                      ? 'bg-yellow-500/10 border-yellow-500 ring-1 ring-yellow-500/50' 
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    applyAiStrategy(idx);
                    aiResultsRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-sm text-[12px] font-black whitespace-nowrap ${selectedAiIndex === idx ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>
                      方案 #{idx + 1}
                    </span>
                    <span className={`text-2xl font-black ${selectedAiIndex === idx ? 'text-yellow-400' : 'text-white'}`}>{arr.score}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {arr.combos.map((c, i) => (
                      <div key={i} className="bg-black/30 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400 whitespace-nowrap">
                        {c.type}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {isCalculating && (
                <div className="min-w-[280px] bg-white/5 rounded-xl p-4 flex items-center justify-center italic text-slate-500 text-xs">
                  正在模拟数千种出牌可能...
                </div>
              )}
            </div>

            {/* 方案详情图谱 */}
            <div ref={aiResultsRef} className="mt-8 pt-12">
              <div className="space-y-16 pb-20">
                {topArrangements.map((arr, idx) => (
                  <div 
                    key={idx} 
                    id={`ai-strategy-${idx}`}
                    className={`rounded-3xl p-8 border transition-all relative group ${
                      selectedAiIndex === idx 
                        ? 'bg-yellow-500/5 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.05)]' 
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className={`absolute top-0 left-8 -translate-y-1/2 px-6 py-2 rounded-full text-[13px] font-black shadow-xl transition-all z-10 whitespace-nowrap border-2 ${
                      selectedAiIndex === idx 
                        ? 'bg-yellow-500 text-slate-900 border-yellow-400' 
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      方案 #{idx + 1}
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="md:w-52 shrink-0 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0">
                        <span className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest whitespace-nowrap">综合评分</span>
                        <span className={`text-6xl font-black mb-3 leading-none ${selectedAiIndex === idx ? 'text-yellow-400' : 'text-white/80'}`}>{arr.score}</span>
                        {getEvaluationTags(arr.score, arr.combos)}
                        <div className="mt-6 overflow-hidden">
                          <h5 className="text-[8px] font-black text-slate-600 uppercase mb-3 tracking-tighter">详细得分点</h5>
                          {renderBreakdown(arr.scoreBreakdown)}
                        </div>
                        <button 
                          onClick={() => applyAiStrategy(idx)}
                          className="mt-8 text-[11px] font-black bg-white/5 hover:bg-white/10 py-3 rounded-xl border border-white/10 transition-all uppercase tracking-widest whitespace-nowrap"
                        >
                          {selectedAiIndex === idx ? "正在预览方案" : "选用此套方案"}
                        </button>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-6 tracking-widest border-b border-white/5 pb-3">详细组牌序列</h4>
                        <div className="flex flex-wrap gap-4 items-start content-start">
                          {arr.combos.map((c, i) => (
                            <ComboGroup key={i} combo={c} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <footer className="mt-auto py-10 text-center border-t border-white/5 text-[9px] text-slate-600 uppercase font-bold tracking-[0.6em] opacity-40">
         Master Evaluator v5.5 • Ultimate Guandan Strategy
      </footer>
    </div>
  );
};

export default App;
