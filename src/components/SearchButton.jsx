function SearchButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-xl transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-95"
      style={{ color: 'var(--text-secondary)' }}
      title="Buscar (Ctrl+K)"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  );
}

export default SearchButton;
