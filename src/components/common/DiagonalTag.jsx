import React from 'react';

const DiagonalTag = ({ text, colorClass }) => (
    <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden pointer-events-none z-10">
        <div className={`absolute top-4 -right-7 w-28 py-1 rotate-45 text-center text-[11px] font-black text-white shadow-md ${colorClass} flex items-center justify-center`}>
            <span className="w-full text-center leading-none inline-block uppercase tracking-tight">{text}</span>
        </div>
    </div>
);

export default DiagonalTag;
