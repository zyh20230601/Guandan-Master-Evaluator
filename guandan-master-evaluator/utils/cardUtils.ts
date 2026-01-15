
import { Card, Suit } from '../types';

const SUITS: Suit[] = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
const NATURAL_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function generateDeck(levelRank: number = 2): Card[] {
  const deck: Card[] = [];
  
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const actualRank of NATURAL_RANKS) {
        if (actualRank === levelRank) {
          deck.push(createCard(suit, 15, actualRank, rankToDisplay(actualRank)));
        } else {
          deck.push(createCard(suit, actualRank, actualRank));
        }
      }
    }
    deck.push(createCard('Joker', 16, 16, 'BJ'));
    deck.push(createCard('Joker', 17, 17, 'RJ'));
  }
  
  return deck;
}

function createCard(suit: Suit, rank: number, originalRank: number, displayOverride?: string): Card {
  const isMagic = (suit === 'Hearts' && rank === 15);
  return {
    id: Math.random().toString(36).substr(2, 9),
    suit,
    rank,
    originalRank,
    displayRank: displayOverride || rankToDisplay(originalRank),
    isMagic
  };
}

function rankToDisplay(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  if (rank >= 16) return rank === 16 ? 'BJ' : 'RJ';
  return rank.toString();
}

export function shuffle<T,>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function deal(deck: Card[]): Card[][] {
  const players: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => {
    players[index % 4].push(card);
  });
  return players;
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    return a.suit.localeCompare(b.suit);
  });
}
