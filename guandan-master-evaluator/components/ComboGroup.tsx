
import React from 'react';
import { Combo } from '../types';
import CardView from './CardView';

interface ComboGroupProps {
  combo: Combo;
  onRemove?: () => void;
}

const ComboGroup: React.FC<ComboGroupProps> = ({ combo, onRemove }) => {
  return (
    <div className="flex flex-col items-center bg-black/40 p-2 rounded-lg border border-white/10 hover:border-yellow-500/30 transition-all shadow-lg relative group/combo">
      {onRemove && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full opacity-0 group-hover/combo:opacity-100 transition-opacity z-50 hover:bg-red-500 border border-white/20 shadow-md"
          title="取消此组合"
        >
          ✕
        </button>
      )}
      <span className="text-[9px] uppercase font-black text-slate-500 mb-2 tracking-tighter border-b border-white/5 w-full text-center pb-1">
        {combo.type}
      </span>
      <div className="flex gap-0.5">
        {combo.cards.map((card) => (
          <CardView key={card.id} card={card} size="sm" />
        ))}
      </div>
    </div>
  );
};

export default ComboGroup;
