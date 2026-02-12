import React from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';

const FAB = ({ onAdd }) => {
    const { theme } = useApp();

    return (
        <button
            onClick={onAdd}
            className={`absolute bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] right-8 w-16 h-16 rounded-md ${theme.primary} text-white shadow-lg flex items-center justify-center active:scale-90 active:rotate-12 transition-all z-50`}
        >
            <Icon name="plus" size={32} />
        </button>
    );
};

export default FAB;
