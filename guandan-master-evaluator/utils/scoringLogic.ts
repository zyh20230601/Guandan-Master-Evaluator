
import { Card, Combo, ComboType, HandArrangement, Suit, ScoreDetail } from '../types';

/**
 * 核心识别函数：判断一组牌的牌型
 */
export function identifyCombo(cards: Card[]): Combo | null {
  if (cards.length === 0) return null;
  const len = cards.length;
  
  const magicCards = cards.filter(c => c.isMagic);
  const normalCards = cards.filter(c => !c.isMagic);
  const mCount = magicCards.length;

  const getFreqs = (cs: Card[]) => {
    const f: Record<number, number> = {};
    cs.forEach(c => {
      f[c.rank] = (f[c.rank] || 0) + 1;
    });
    return f;
  };

  // 1. 四大天王
  if (len === 4 && cards.every(c => c.suit === 'Joker')) {
    return { type: ComboType.SuperBomb, cards, power: 5000 };
  }

  // 2. 炸弹 (4-10张)
  const nFreqs = getFreqs(normalCards);
  const nRanks = Object.keys(nFreqs).map(Number);
  if (len >= 4 && nRanks.length <= 1) {
    if (normalCards.every(c => c.suit !== 'Joker')) {
      const rank = nRanks[0] || 15; 
      return { type: ComboType.Bomb, cards, power: rank };
    }
  }

  // 3. 单张/对子/三张
  if (len >= 1 && len <= 3 && nRanks.length <= 1 && normalCards.every(c => c.suit !== 'Joker')) {
    const rank = nRanks[0] || 15;
    if (len === 1) return { type: ComboType.Single, cards, power: rank };
    if (len === 2) return { type: ComboType.Pair, cards, power: rank };
    if (len === 3) return { type: ComboType.Triple, cards, power: rank };
  }

  // 4. 三带二 (Full House)
  if (len === 5 && nRanks.length <= 2) {
    for (const r of nRanks) {
      const neededForTriple = Math.max(0, 3 - (nFreqs[r] || 0));
      const otherRank = nRanks.find(x => x !== r);
      const neededForPair = otherRank ? Math.max(0, 2 - (nFreqs[otherRank] || 0)) : 2;
      if (neededForTriple + neededForPair <= mCount) {
        return { type: ComboType.FullHouse, cards, power: r };
      }
    }
  }

  // 5. 顺子 & 同花顺
  if (len === 5 && !normalCards.some(c => c.suit === 'Joker')) {
    const checkStraightDetails = (cs: Card[]) => {
      const cardPossibilities = cs.map(c => {
        const p = [c.originalRank];
        if (c.originalRank === 14) p.push(1); 
        if (c.rank === 15) p.push(15); 
        return p;
      });

      const getAllPermutations = (index: number): number[][] => {
        if (index === cardPossibilities.length) return [[]];
        const res: number[][] = [];
        const suffixes = getAllPermutations(index + 1);
        for (const val of cardPossibilities[index]) {
          for (const suffix of suffixes) {
            res.push([val, ...suffix]);
          }
        }
        return res;
      };

      const permutations = getAllPermutations(0);
      let bestPower = -1;

      for (const pValues of permutations) {
        const uniqueValues = Array.from(new Set(pValues)).sort((a, b) => a - b);
        if (uniqueValues.length + mCount >= 5) {
          // 限制 start 最大为 10，即最高到 10-J-Q-K-A (14)
          // 防止出现包含级牌（15）的高位顺子
          for (let start = 1; start <= 10; start++) {
            const targets = [0, 1, 2, 3, 4].map(i => start + i);
            const matches = uniqueValues.filter(v => targets.includes(v));
            if (matches.length + mCount >= 5) {
              const power = start + 4;
              bestPower = Math.max(bestPower, power);
            }
          }
        }
      }
      return bestPower;
    };

    const power = checkStraightDetails(normalCards);
    if (power !== -1) {
      const isSameSuit = new Set(normalCards.map(c => c.suit)).size <= 1;
      if (isSameSuit && normalCards.length > 0) return { type: ComboType.StraightFlush, cards, power: 1000 + power };
      return { type: ComboType.Straight, cards, power };
    }
  }

  // 6. 钢板 (6张)
  if (len === 6) {
    const nRanks = Array.from(new Set(normalCards.map(c => c.rank))).sort((a, b) => a - b);
    const checkPlate = (ranks: number[]) => {
      const variants = [ranks];
      if (ranks.includes(14)) variants.push(ranks.map(r => r === 14 ? 1 : r).sort((a, b) => a - b));
      return variants.some(v => {
        if (v.length > 2) return false;
        // 禁止包含 A(14) 和 级牌(15) 的组合
        if (v.includes(14) && v.includes(15)) return false;

        let cost = 0;
        v.forEach(r => {
           const count = normalCards.filter(c => (r === 1 ? c.originalRank === 14 : c.rank === r) || (r === c.originalRank)).length;
           cost += Math.max(0, 3 - count);
        });
        if (v.length === 1) cost += 3;
        return (cost <= mCount) && (v.length === 0 || v.length === 1 || (v.length === 2 && v[1] === v[0] + 1));
      });
    };
    if (checkPlate(nRanks)) {
      return { type: ComboType.Plate, cards, power: Math.max(...normalCards.map(c => c.rank)) };
    }
  }

  // 7. 连对 (6张)
  if (len === 6) {
    const nRanks = Array.from(new Set(normalCards.map(c => c.rank))).sort((a, b) => a - b);
    const checkTube = (ranks: number[]) => {
      const variants = [ranks];
      if (ranks.includes(14)) variants.push(ranks.map(r => r === 14 ? 1 : r).sort((a, b) => a - b));
      return variants.some(v => {
        if (v.length > 3) return false;
        // 禁止包含 A(14) 和 级牌(15) 的组合，如 22-AA-KK (当2为级牌时)
        if (v.includes(14) && v.includes(15)) return false;

        let cost = 0;
        v.forEach(r => {
           const count = normalCards.filter(c => (r === 1 ? c.originalRank === 14 : c.rank === r) || (r === c.originalRank)).length;
           cost += Math.max(0, 2 - count);
        });
        if (v.length < 3) cost += (3 - v.length) * 2;
        return (cost <= mCount) && (v.length === 0 || v[v.length - 1] - v[0] < 3);
      });
    };
    if (checkTube(nRanks)) {
      return { type: ComboType.Tube, cards, power: Math.max(...normalCards.map(c => c.rank)) };
    }
  }

  return null;
}

/**
 * 计算方案得分
 */
export function calculateFullScoreInfo(combos: Combo[]): { score: number, breakdown: ScoreDetail[] } {
  let score = 20;
  const breakdown: ScoreDetail[] = [{ label: '基础起始', value: 20 }];

  const explosiveTypes = [ComboType.Bomb, ComboType.StraightFlush, ComboType.SuperBomb];
  const nonExplosive = combos.filter(c => !explosiveTypes.includes(c.type));
  if (nonExplosive.length > 0) {
    const penalty = -nonExplosive.length;
    score += penalty;
    breakdown.push({ label: '手数扣减', value: penalty });
  }

  combos.forEach(c => {
    if (c.type === ComboType.SuperBomb) {
      score += 4;
      breakdown.push({ label: '四大天王', value: 4 });
    } else if (c.type === ComboType.StraightFlush) {
      score += 3;
      breakdown.push({ label: '同花顺奖', value: 3 });
    } else if (c.type === ComboType.Bomb) {
      const val = c.cards.length >= 6 ? 3 : 2;
      score += val;
      breakdown.push({ label: `${c.cards.length}张炸弹`, value: val });
    }
  });

  const allCards = combos.flatMap(c => c.cards);
  const redJokers = allCards.filter(c => c.suit === 'Joker' && c.rank === 17);
  const blackJokers = allCards.filter(c => c.suit === 'Joker' && c.rank === 16);
  if (redJokers.length > 0) {
    score += redJokers.length;
    breakdown.push({ label: `大王奖 x${redJokers.length}`, value: redJokers.length });
  }
  if (blackJokers.length === 2) {
    score += 1;
    breakdown.push({ label: '双小王奖', value: 1 });
  }

  // 顺子最高位包含 K(13), A(14), L(15) 为高位。A-2-3-4-5 (5) 不是高位。
  const highStraights = combos.filter(c => c.type === ComboType.Straight && c.power >= 13);
  if (highStraights.length > 0) {
    score += 1; 
    breakdown.push({ label: '高位顺子奖', value: 1 });
  }
  
  const highFullHouse = combos.some(c => c.type === ComboType.FullHouse && c.power >= 15);
  if (highFullHouse) {
    score += 1;
    breakdown.push({ label: '高位三带二', value: 1 });
  }

  const plates = combos.filter(c => c.type === ComboType.Plate);
  if (plates.length > 0) {
    score += plates.length;
    breakdown.push({ label: `钢板奖 x${plates.length}`, value: plates.length });
  }

  const tubes = combos.filter(c => c.type === ComboType.Tube);
  if (tubes.length > 0) {
    score += tubes.length;
    breakdown.push({ label: `连对奖 x${tubes.length}`, value: tubes.length });
  }

  const lowSingles = combos.filter(c => c.type === ComboType.Single && c.power < 8);
  if (lowSingles.length > 0) {
    score -= lowSingles.length;
    breakdown.push({ label: '弱势单张惩罚', value: -lowSingles.length });
  }
  const lowPairs = combos.filter(c => c.type === ComboType.Pair && c.power < 6);
  if (lowPairs.length > 0) {
    score -= lowPairs.length;
    breakdown.push({ label: '弱势对子惩罚', value: -lowPairs.length });
  }

  return { score, breakdown };
}

/**
 * 全面搜索候选组合，包含各种潜在的高分组合
 */
function findAllPossibleCombos(hand: Card[]): Combo[] {
  const candidates: Combo[] = [];
  if (hand.length === 0) return [];
  
  const jokers = hand.filter(c => c.suit === 'Joker');
  if (jokers.length === 4) candidates.push({ type: ComboType.SuperBomb, cards: jokers, power: 5000 });

  const magicPool = hand.filter(c => c.isMagic);
  const normal = hand.filter(c => !c.isMagic && c.suit !== 'Joker');

  // 1. 炸弹：尝试各种点数的所有有效长度炸弹
  const freqs: Record<number, Card[]> = {};
  normal.forEach(c => { freqs[c.rank] = freqs[c.rank] || []; freqs[c.rank].push(c); });
  Object.keys(freqs).map(Number).forEach(r => {
    const base = freqs[r];
    for (let len = 4; len <= Math.min(10, base.length + magicPool.length); len++) {
      const neededMagic = Math.max(0, len - base.length);
      if (neededMagic <= magicPool.length) {
        candidates.push({ 
          type: ComboType.Bomb, 
          cards: [...base.slice(0, Math.min(base.length, len)), ...magicPool.slice(0, neededMagic)], 
          power: r 
        });
      }
    }
  });

  // 2. 顺子 & 同花顺
  const suits: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
  suits.forEach(suit => {
    const sCards = hand.filter(c => c.suit === suit && !c.isMagic);
    // 限制最高搜索到 10-J-Q-K-A (14)
    for (let start = 1; start <= 10; start++) {
      const targets = [0, 1, 2, 3, 4].map(i => start + i);
      const matchedByValue: Map<number, Card[]> = new Map();
      
      sCards.forEach(c => {
        if (targets.includes(c.originalRank)) {
          const l = matchedByValue.get(c.originalRank) || [];
          l.push(c); matchedByValue.set(c.originalRank, l);
        }
        if (targets.includes(1) && c.originalRank === 14) {
          const l = matchedByValue.get(1) || [];
          l.push(c); matchedByValue.set(1, l);
        }
        if (targets.includes(15) && c.rank === 15) {
          const l = matchedByValue.get(15) || [];
          l.push(c); matchedByValue.set(15, l);
        }
      });

      if (matchedByValue.size + magicPool.length >= 5) {
        // 尝试构建顺子。此处简单选择一种排列
        const comboCards: Card[] = [];
        let magicUsed = 0;
        targets.forEach(t => {
          const matches = matchedByValue.get(t);
          if (matches && matches.length > 0) comboCards.push(matches[0]);
          else if (magicUsed < magicPool.length) {
            comboCards.push(magicPool[magicUsed]);
            magicUsed++;
          }
        });
        if (comboCards.length === 5) {
          const combo = identifyCombo(comboCards);
          if (combo) candidates.push(combo);
        }
      }
    }
  });

  return candidates;
}

/**
 * 更加智能的散牌收尾
 */
export function solveRemaining(remaining: Card[], baseCombos: Combo[]): HandArrangement {
  const combos = [...baseCombos];
  let currentHand = [...remaining];

  const extractType = (type: ComboType, checkFn: (cs: Card[]) => Combo | null) => {
    let found = true;
    while (found) {
      found = false;
      const cards = currentHand;
      // 这里的逻辑可以进一步优化为对 currentHand 的组合搜索
      // 但为了性能，目前采用贪婪扫描
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j <= cards.length; j++) {
           const sub = cards.slice(i, j);
           const combo = checkFn(sub);
           if (combo && combo.type === type) {
             combos.push(combo);
             const ids = new Set(combo.cards.map(c => c.id));
             currentHand = currentHand.filter(c => !ids.has(c.id));
             found = true;
             break;
           }
        }
        if (found) break;
      }
    }
  };

  // 散牌提取优先级：钢板 -> 连对 -> 三张 -> 对子 -> 单张
  // 这里的 identifyCombo 已经涵盖了这些类型
  extractType(ComboType.Plate, identifyCombo);
  extractType(ComboType.Tube, identifyCombo);
  extractType(ComboType.Triple, identifyCombo);
  extractType(ComboType.Pair, identifyCombo);
  
  // 最后的单张
  currentHand.forEach(c => {
    combos.push({ type: ComboType.Single, cards: [c], power: c.rank });
  });

  const { score, breakdown } = calculateFullScoreInfo(combos);
  return { combos, score, scoreBreakdown: breakdown, unassigned: [] };
}

/**
 * 寻找前 N 个最优方案：采用递归分支搜索
 */
export function findTopArrangements(hand: Card[], count: number): HandArrangement[] {
  const finalResults: HandArrangement[] = [];
  const seenMap = new Set<string>();

  // 获取所有可能的大牌组合
  const bigCandidates = findAllPossibleCombos(hand);
  
  // 启发式排序：同花顺、天王、长炸弹优先尝试
  bigCandidates.sort((a, b) => {
    const val = (c: Combo) => {
      if (c.type === ComboType.SuperBomb) return 1000;
      if (c.type === ComboType.StraightFlush) return 800;
      if (c.type === ComboType.Bomb) return 500 + c.cards.length * 10 + c.power;
      if (c.type === ComboType.Straight) return 200 + (c.power >= 13 ? 50 : 0);
      return 0;
    };
    return val(b) - val(a);
  });

  function search(currentHand: Card[], currentCombos: Combo[], depth: number) {
    // 递归限制：搜索深度和结果集大小
    if (depth > 8 || finalResults.length > 200) {
      const res = solveRemaining(currentHand, currentCombos);
      addResult(res);
      return;
    }

    // 找到在当前手牌中可用的候选组合
    const available = bigCandidates.filter(c => 
      c.cards.every(bc => currentHand.some(rc => rc.id === bc.id))
    );

    if (available.length === 0) {
      const res = solveRemaining(currentHand, currentCombos);
      addResult(res);
      return;
    }

    // 分支宽度：根节点尝试更多可能，深层节点收敛
    const branchWidth = depth === 0 ? 20 : (depth < 3 ? 5 : 2);
    for (let i = 0; i < Math.min(available.length, branchWidth); i++) {
      const combo = available[i];
      const nextHand = currentHand.filter(c => !combo.cards.some(cc => cc.id === c.id));
      search(nextHand, [...currentCombos, combo], depth + 1);
    }
    
    // 同时尝试不提取任何大牌直接收尾的可能（保底）
    if (depth === 0) {
      addResult(solveRemaining(currentHand, currentCombos));
    }
  }

  function addResult(res: HandArrangement) {
    // 使用组合详情生成唯一 Key 以去重
    const key = res.combos.map(c => `${c.type}-${c.power}-${c.cards.length}`).sort().join('|');
    if (!seenMap.has(key)) {
      seenMap.add(key);
      finalResults.push(res);
    }
  }

  // 启动深度搜索
  search(hand, [], 0);

  // 返回得分最高的 count 个方案，且分值互不相同
  return finalResults
    .sort((a, b) => b.score - a.score)
    .filter((v, i, a) => a.findIndex(t => t.score === v.score) === i)
    .slice(0, count);
}

/**
 * 简单的默认求解（用于 UI 快速反馈）
 */
export function solveHand(hand: Card[]): HandArrangement {
  return solveRemaining(hand, []);
}
