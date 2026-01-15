
import React from 'react';
import { Suit } from './types';

export const RANK_MAP: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: 'L', 16: 'BJ', 17: 'RJ'
};

export const SUIT_ICONS: Record<Suit, React.ReactNode> = {
  Spades: <span className="text-black">♠</span>,
  Hearts: <span className="text-red-500">♥</span>,
  Clubs: <span className="text-black">♣</span>,
  Diamonds: <span className="text-red-500">♦</span>,
  Joker: <span className="text-orange-500">★</span>
};

export const COMBO_SCORES: Record<string, number> = {
  '单张': 2,
  '对子': 5,
  '三张': 10,
  '三带二': 25,
  '顺子': 45,
  '连对': 55,
  '钢板': 80,
  '炸弹': 160,
  '同花顺': 450,
  '四大天王': 1200
};
