import React from 'react';

const DiagonalTag = ({ text, colorClass }) => (
    <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none z-10">
        <div className={`absolute top-5 -right-8 w-32 py-1 rotate-45 text-center text-[14px] font-black text-white shadow-md ${colorClass} flex items-center justify-center`}>
            <span className="w-full text-center leading-none inline-block uppercase tracking-wider">{text}</span>
        </div>
    </div>
);

export default DiagonalTag;
