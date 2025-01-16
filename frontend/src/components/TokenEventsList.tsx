import { Component, createSignal, createMemo, onMount } from 'solid-js';
import { createVirtualizer } from '@tanstack/solid-virtual';
import { TokenEventCard } from './TokenEventCard';
import { Layout, List } from 'lucide-solid';
import type { Token, FilterState, ThemeColors } from '../types';

interface TokenEventsListProps {
  tokens: Token[];
  onColorsChange: (colors: ThemeColors) => void;
}

type SortField = 'age' | 'holders' | 'liquidity' | 'safetyScore';

const STORAGE_KEY = 'tokenListFilters';

export const TokenEventsList: Component<TokenEventsListProps> = (props) => {
  // Performance metrics
  const [fps, setFps] = createSignal(60);
  const [memory, setMemory] = createSignal(0);
  const [isConnected, setIsConnected] = createSignal(true);

  // Update performance metrics
  let lastTime = performance.now();
  let frame = 0;

  const updateMetrics = () => {
    const now = performance.now();
    frame++;
    
    if (now >= lastTime + 1000) {
      setFps(Math.round((frame * 1000) / (now - lastTime)));
      // Safely handle memory metrics
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        setMemory(Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024 * 100) / 100);
      }
      frame = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(updateMetrics);
  };

  onMount(() => {
    updateMetrics();
  });

  const [expandedTokens, setExpandedTokens] = createSignal<Set<string>>(new Set());
  
  const toggleTokenExpansion = (tokenAddress: string) => {
    setExpandedTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenAddress)) {
        newSet.delete(tokenAddress);
      } else {
        newSet.add(tokenAddress);
      }
      return newSet;
    });
  };

  // Load saved filters from localStorage or use defaults
  const getSavedFilters = (): FilterState => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    }
    return {
      minHolders: 0,
      minLiquidity: 0,
      hideHoneypots: false,
      showOnlyHoneypots: false,
      hideDanger: false,
      hideWarning: false,
      showOnlySafe: false,
      searchQuery: '',
      sortBy: 'age',
      sortDirection: 'desc',
      maxRecords: 50,
      hideStagnantHolders: false,
      hideStagnantLiquidity: false,
      stagnantRecordCount: 10
    };
  };

  const [filters, setFilters] = createSignal<FilterState>(getSavedFilters());

  // Save filters whenever they change
  const updateFilters = (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
    setFilters(prev => {
      const updated = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Calculate numeric risk score
  const getRiskScore = (token: Token): number => {
    switch (token.riskLevel) {
      case 'safe':
        return 2;
      case 'warning':
        return 1;
      case 'danger':
        return 0;
      default:
        return 0;
    }
  };

  // Memoized filtered and sorted tokens
  const filteredTokens = createMemo(() => {
    console.log('TokenEventsList: Filtering tokens:', props.tokens.length);
    let result = [...props.tokens];
    const currentFilters = filters();

    // Apply filters
    result = result.filter(token => {
      if (currentFilters.hideHoneypots && token.hpIsHoneypot) return false;
      if (currentFilters.showOnlyHoneypots && !token.hpIsHoneypot) return false;
      if (currentFilters.hideDanger && token.riskLevel === 'danger') return false;
      if (currentFilters.hideWarning && token.riskLevel === 'warning') return false;
      if (currentFilters.showOnlySafe && token.riskLevel !== 'safe') return false;
      
      // Apply min holders filter
      if (currentFilters.minHolders > 0 && token.gpHolderCount < currentFilters.minHolders) return false;
      
      // Apply min liquidity filter
      if (currentFilters.minLiquidity > 0 && token.hpLiquidityAmount < currentFilters.minLiquidity) return false;
      
      // Search query
      if (currentFilters.searchQuery) {
        const query = currentFilters.searchQuery.toLowerCase();
        return (
          token.tokenName.toLowerCase().includes(query) ||
          token.tokenSymbol.toLowerCase().includes(query) ||
          token.tokenAddress.toLowerCase().includes(query)
        );
      }
      
      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      const sortBy = currentFilters.sortBy;
      let direction = -1; // Default to descending
      let field: SortField = 'age'; // Default field

      // Check if it's an ascending sort
      if (sortBy.endsWith('_asc')) {
        direction = 1;
        field = sortBy.replace('_asc', '') as SortField;
      } else {
        field = sortBy as SortField;
      }
      
      switch (field) {
        case 'age':
          return (b.tokenAgeHours - a.tokenAgeHours) * direction;
        case 'holders':
          return (a.gpHolderCount - b.gpHolderCount) * direction;
        case 'liquidity':
          return (a.hpLiquidityAmount - b.hpLiquidityAmount) * direction;
        case 'safetyScore':
          const scoreA = getRiskScore(a);
          const scoreB = getRiskScore(b);
          return (scoreA - scoreB) * direction;
        default:
          return 0;
      }
    });

    console.log('TokenEventsList: Filtered tokens:', result.length);
    return result.slice(0, currentFilters.maxRecords);
  });

  // Virtual list setup for both views
  let parentRef: HTMLDivElement | undefined;
  
  const estimateSize = (index: number) => {
    const token = filteredTokens()[index];
    if (!token) return 60;
    
    // Base height for compact view
    if (!expandedTokens().has(token.tokenAddress)) {
      return 84; // Increased from 60 to account for padding (60 + 24)
    }
    
    // Expanded view height calculation
    let height = 0;
    height += 40; // Top padding
    height += 60; // Top collapse button + margin
    height += 60; // Status bubbles + margin
    
    // Warning reasons section (if any)
    const warningCount = (token.gpIsProxy ? 1 : 0) + 
                        (token.gpIsMintable ? 1 : 0) + 
                        (token.gpHasProxyCalls ? 1 : 0) + 
                        (token.gpCannotBuy ? 1 : 0) + 
                        (token.gpCannotSellAll ? 1 : 0) + 
                        (token.gpTradingCooldown ? 1 : 0) + 
                        (token.gpTransferPausable ? 1 : 0) + 
                        (token.gpSlippageModifiable ? 1 : 0) + 
                        (token.gpHiddenOwner ? 1 : 0);
    if (warningCount > 0) {
      height += 80 + (warningCount * 24); // Header + warnings
    }
    
    // Core sections
    height += 300; // Trading Information
    height += 400; // Contract Information (includes long addresses)
    height += 200; // Security Settings
    height += 300; // Holder Information
    height += 200; // Additional Information
    
    // Dynamic sections
    if (token.gpTrustList) height += 40;
    if (token.gpOtherPotentialRisks) height += 40;
    if (token.gpHolders) height += 40;
    if (token.gpLpHolders) height += 40;
    if (token.gpDexInfo) height += 40;
    
    // Charts section
    height += 40; // Section padding
    height += 40; // Liquidity chart header
    height += 200; // Liquidity chart
    height += 40; // Holders chart header
    height += 200; // Holders chart
    height += 40; // Section padding
    
    // History table
    height += 40; // Table header
    height += 200; // Table height
    height += 40; // Table padding
    
    height += 60; // Bottom collapse button + margin
    height += 40; // Bottom padding
    
    return height;
  };

  const virtualizer = createVirtualizer({
    count: filteredTokens().length,
    getScrollElement: () => document.documentElement,
    estimateSize,
    overscan: 5,
    scrollMargin: 300 // Account for the fixed header
  });

  const CompactRow: Component<{ token: Token }> = (props) => (
    <div class={`w-full bg-black/40 backdrop-blur-sm rd-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 p-4 grid grid-cols-12 gap-4 items-center text-white mb-6`}>
      <div class="col-span-2 truncate">
        <div class="fw-600">{props.token.tokenName}</div>
        <div class="text-sm text-gray-400">{props.token.tokenSymbol}</div>
      </div>
      <div class="col-span-2 truncate text-sm">
        <div class="text-gray-400">Address:</div>
        <div>{props.token.tokenAddress.slice(0, 8)}...{props.token.tokenAddress.slice(-6)}</div>
      </div>
      <div class="col-span-1 text-sm">
        <div class="text-gray-400">Age:</div>
        <div>{props.token.tokenAgeHours.toFixed(1)}h</div>
      </div>
      <div class="col-span-1 text-sm">
        <div class="text-gray-400">Liquidity:</div>
        <div>${props.token.hpLiquidityAmount.toLocaleString()}</div>
      </div>
      <div class="col-span-1 text-sm">
        <div class="text-gray-400">Holders:</div>
        <div>{props.token.gpHolderCount.toLocaleString()}</div>
      </div>
      <div class="col-span-1 text-sm">
        <div class="text-gray-400">Buy Tax:</div>
        <div>{props.token.gpBuyTax}%</div>
      </div>
      <div class="col-span-1 text-sm">
        <div class="text-gray-400">Sell Tax:</div>
        <div>{props.token.gpSellTax}%</div>
      </div>
      <div class="col-span-2">
        <div class={`text-center px-3 py-1 rd-full text-sm fw-600 ${
          props.token.riskLevel === 'safe' ? 'bg-green-100 text-green-800 border border-green-200' :
          props.token.riskLevel === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {props.token.hpIsHoneypot ? 'HONEYPOT' : props.token.riskLevel.toUpperCase()}
        </div>
      </div>
      <div class="col-span-1">
        <button 
          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rd text-sm text-white transition-colors"
          onClick={() => toggleTokenExpansion(props.token.tokenAddress)}
        >
          Expand
        </button>
      </div>
    </div>
  );

  // Search function
  const searchToken = (token: Token, query: string) => {
    query = query.toLowerCase();
    return (
      token.tokenName.toLowerCase().includes(query) ||
      token.tokenSymbol.toLowerCase().includes(query) ||
      token.tokenAddress.toLowerCase().includes(query)
    );
  };

  return (
    <div class="w-full max-w-[1820px] mx-auto px-6 pb-12 pt-24">
      {/* Filters and View Toggle */}
      <div class="sticky top-20 z-50 mb-12 p-6 bg-black/95 backdrop-blur-xl rd-lg border border-gray-700 shadow-xl">
        <div class="mb-4 flex justify-between items-center">
          <div class="text-white text-lg fw-600">Token List</div>
          <div class="flex gap-8 text-white/90">
            <span>Total tokens: {props.tokens.length}</span>
            <span>Filtered: {filteredTokens().length}</span>
            <span>Virtual Items: {virtualizer.getVirtualItems().length}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search tokens..."
            class="px-3 py-2 bg-gray-800 rd border border-gray-700 text-white col-span-2"
            value={filters().searchQuery}
            onInput={(e) => updateFilters(f => ({ ...f, searchQuery: e.currentTarget.value }))}
          />
          
          <select
            class="px-3 py-2 bg-gray-800 rd border border-gray-700 text-white col-span-2"
            value={filters().sortBy}
            onChange={(e) => updateFilters(f => ({ ...f, sortBy: e.currentTarget.value as any }))}
          >
            <option value="age">Sort by Age (Newest)</option>
            <option value="age_asc">Sort by Age (Oldest)</option>
            <option value="liquidity">Sort by Liquidity (Highest)</option>
            <option value="liquidity_asc">Sort by Liquidity (Lowest)</option>
            <option value="holders">Sort by Holders (Most)</option>
            <option value="holders_asc">Sort by Holders (Least)</option>
            <option value="safetyScore">Sort by Safety</option>
          </select>

          {/* Risk Level Filters */}
          <div class="col-span-3 flex gap-4">
            <div class="flex items-center gap-4">
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hideHoneypots"
                  checked={filters().hideHoneypots}
                  onChange={(e) => updateFilters(f => ({ ...f, hideHoneypots: e.currentTarget.checked }))}
                />
                <label for="hideHoneypots" class="text-white/90">Hide Honeypots</label>
              </div>

              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hideWarning"
                  checked={filters().hideWarning}
                  onChange={(e) => updateFilters(f => ({ ...f, hideWarning: e.currentTarget.checked }))}
                />
                <label for="hideWarning" class="text-white/90">Hide Warning</label>
              </div>

              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hideDanger"
                  checked={filters().hideDanger}
                  onChange={(e) => updateFilters(f => ({ ...f, hideDanger: e.currentTarget.checked }))}
                />
                <label for="hideDanger" class="text-white/90">Hide Danger</label>
              </div>
            </div>
          </div>

          {/* View Toggle Button and Filters */}
          <div class="col-span-1 flex justify-end items-center gap-6 px-4">
            {/* Min Holders Filter */}
            <div class="flex items-center gap-1">
              <span class="text-white/60 text-xs whitespace-nowrap">Min Holders:</span>
              <input
                type="number"
                placeholder="0"
                class="w-20 px-2 py-1 bg-gray-800 rd border border-gray-700 text-white text-sm"
                value={filters().minHolders}
                onInput={(e) => updateFilters(f => ({ ...f, minHolders: parseInt(e.currentTarget.value) || 0 }))}
              />
            </div>

            {/* Min Liquidity Filter */}
            <div class="flex items-center gap-1">
              <span class="text-white/60 text-xs whitespace-nowrap">Min Liq($):</span>
              <input
                type="number"
                placeholder="0"
                class="w-20 px-2 py-1 bg-gray-800 rd border border-gray-700 text-white text-sm"
                value={filters().minLiquidity}
                onInput={(e) => updateFilters(f => ({ ...f, minLiquidity: parseInt(e.currentTarget.value) || 0 }))}
              />
            </div>

            {/* View Toggle Button */}
            <button
              class="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 rd text-white transition-colors whitespace-nowrap min-w-[160px]"
              onClick={() => {
                const currentTokens = filteredTokens();
                setExpandedTokens(prev => {
                  // If any tokens are expanded, collapse all. Otherwise, expand all.
                  const hasExpanded = currentTokens.some(token => prev.has(token.tokenAddress));
                  if (hasExpanded) {
                    return new Set<string>();
                  } else {
                    return new Set(currentTokens.map(token => token.tokenAddress));
                  }
                });
              }}
            >
              {virtualizer.getVirtualItems().some(row => {
                const token = filteredTokens()[row.index];
                return token && expandedTokens().has(token.tokenAddress);
              }) ? <List size={18} /> : <Layout size={18} />}
              <span>{virtualizer.getVirtualItems().some(row => {
                const token = filteredTokens()[row.index];
                return token && expandedTokens().has(token.tokenAddress);
              }) ? 'Compact View' : 'Detailed View'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Virtual List Container */}
      <div 
        ref={parentRef} 
        class="relative w-full min-h-screen"
        style={{
          height: `${virtualizer.getTotalSize() + 500}px`
        }}
      >
        <div
          style={{
            width: '100%',
            position: 'relative',
            height: '100%'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const token = filteredTokens()[virtualRow.index];
            if (!token) return null;
            
            const isExpanded = expandedTokens().has(token.tokenAddress);
            
            return (
              <div
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: `${virtualRow.start}px`,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  'box-sizing': 'border-box',
                  padding: '12px 12px 24px 12px',
                  'overflow-y': 'visible',
                  'z-index': isExpanded ? 10 : 1,
                  'transform': 'translate3d(0,0,0)',
                  'will-change': 'transform'
                }}
              >
                {!isExpanded ? (
                  <CompactRow token={token} />
                ) : (
                  <div class="w-full h-full bg-black/40 backdrop-blur-sm rd-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 relative">
                    <div class="p-6 relative z-20">
                      <div class="flex justify-end mb-4">
                        <button 
                          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rd text-sm text-white transition-colors"
                          onClick={() => toggleTokenExpansion(token.tokenAddress)}
                        >
                          Collapse
                        </button>
                      </div>
                      <div class="flex gap-4 mb-4">
                        <div class="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rd-full text-sm fw-600">
                          Age: {token.tokenAgeHours.toFixed(1)}h
                        </div>
                        <div class="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rd-full text-sm fw-600">
                          Liquidity: ${token.hpLiquidityAmount.toLocaleString()}
                        </div>
                        <div class="bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1 rd-full text-sm fw-600">
                          Holders: {token.gpHolderCount.toLocaleString()}
                        </div>
                        <div class={`px-3 py-1 rd-full text-sm fw-600 ${
                          token.riskLevel === 'safe' ? 'bg-green-100 text-green-800 border border-green-200' :
                          token.riskLevel === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {token.hpIsHoneypot ? 'HONEYPOT' : token.riskLevel.toUpperCase()}
                        </div>
                      </div>
                      <TokenEventCard token={token} />
                      <div class="mt-4 flex justify-end">
                        <button 
                          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rd text-sm text-white transition-colors"
                          onClick={() => toggleTokenExpansion(token.tokenAddress)}
                        >
                          Collapse
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
