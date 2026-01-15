
import React from 'react';
import { Card } from '../types';
import { SUIT_ICONS } from '../constants';

interface CardViewProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const CardView: React.FC<CardViewProps> = ({ 
  card, 
  size = 'md', 
  className = '', 
  selected = false,
  disabled = false,
  onClick 
}) => {
  const isJoker = card.suit === 'Joker';
  const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds' || (isJoker && card.rank === 17);
  
  // 极窄条带尺寸，宽度从 w-20 缩减至 w-9
  const sizeClasses = {
    sm: 'w-7 h-10 text-[9px]',
    md: 'w-9 h-12 text-[11px]',
    lg: 'w-11 h-14 text-xs'
  };

  const isLevelCard = card.rank === 15 || card.isMagic;

  // 基础样式：紧凑边框
  const baseClass = "bg-white border border-slate-400 rounded-sm shadow-sm flex flex-col items-center justify-center overflow-hidden";
  
  // 选中状态：明亮黄色背景，稍微向上偏移
  const selectedClass = selected 
    ? 'ring-2 ring-yellow-400 bg-yellow-50 z-50 -translate-y-2 shadow-md' 
    : 'z-10 hover:bg-slate-50';

  const disabledClass = disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer transition-all duration-150';

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        ${sizeClasses[size]} 
        ${className}
        ${baseClass}
        ${selectedClass}
        ${disabledClass}
        relative select-none
        ${isRed ? 'text-red-600' : 'text-slate-900'}
      `}
    >
      {/* 垂直排布数字和花色，适应极窄宽度 */}
      <div className="flex flex-col items-center leading-none">
        <span className="font-black tracking-tighter mb-0.5">
          {isJoker ? (card.rank === 17 ? 'R' : 'B') : card.displayRank}
        </span>
        <span className="text-sm">
          {isJoker ? '★' : SUIT_ICONS[card.suit]}
        </span>
      </div>

      {/* 级牌标识：缩小版悬浮在右上角 */}
      {isLevelCard && (
        <div className="absolute top-0 right-0 bg-orange-500 text-[7px] text-white px-0.5 font-bold rounded-bl-sm leading-tight">
          级
        </div>
      )}
    </div>
  );
};

export default CardView;
