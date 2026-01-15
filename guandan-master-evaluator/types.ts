
export type Suit = 'Spades' | 'Hearts' | 'Clubs' | 'Diamonds' | 'Joker';

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // Weighted rank: 3=3, ..., 14=A, 15=Level, 16=BJ, 17=RJ
  originalRank: number; // Natural rank: 2-14 (Ace is 14)
  displayRank: string;
  isMagic?: boolean; // Heart Level Card (Wild)
}

export enum ComboType {
  Single = '单张',
  Pair = '对子',
  Triple = '三张',
  FullHouse = '三带二',
  Straight = '顺子',
  Tube = '连对', 
  Plate = '钢板', 
  Bomb = '炸弹',
  StraightFlush = '同花顺',
  SuperBomb = '四大天王'
}

export interface Combo {
  type: ComboType;
  cards: Card[];
  power: number;
}

export interface ScoreDetail {
  label: string;
  value: number;
}

export interface HandArrangement {
  combos: Combo[];
  score: number;
  scoreBreakdown: ScoreDetail[];
  unassigned: Card[];
}
