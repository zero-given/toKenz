import { Component, createSignal, createMemo } from 'solid-js';
import { createVirtualizer } from '@tanstack/solid-virtual';
import { TokenEventCard } from './TokenEventCard';
import { Layout, List } from 'lucide-solid';
import type { Token, FilterState, ThemeColors } from '../types';

interface TokenEventsListProps {
  tokens: Token[];
  onColorsChange: (colors: ThemeColors) => void;
}

export const TokenEventsList: Component<TokenEventsListProps> = (props) => {
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

  // Filter state
  const [filters, setFilters] = createSignal<FilterState>({
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
  });

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
      let field = sortBy;

      // Check if it's an ascending sort
      if (sortBy.endsWith('_asc')) {
        direction = 1;
        field = sortBy.replace('_asc', '');
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
  
  const virtualizer = createVirtualizer({
    count: filteredTokens().length,
    getScrollElement: () => document.documentElement,
    estimateSize: (index) => {
      const token = filteredTokens()[index];
      return expandedTokens().has(token?.tokenAddress) ? 2400 : 60;
    },
    overscan: 5,
    paddingStart: 20,
    paddingEnd: 20
  });

  const CompactRow: Component<{ token: Token }> = (props) => (
    <div class={`w-full bg-black/40 backdrop-blur-sm rd-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 p-4 grid grid-cols-12 gap-4 items-center text-white`}>
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
      <div class="sticky top-20 z-10 mb-12 p-6 bg-black/80 backdrop-blur-sm rd-lg border border-gray-700">
        <div class="mb-4">
          <div class="text-white text-lg fw-600">Token List</div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search tokens..."
            class="px-3 py-2 bg-gray-800 rd border border-gray-700 text-white col-span-2"
            onInput={(e) => setFilters(f => ({ ...f, searchQuery: e.currentTarget.value }))}
          />
          
          <select
            class="px-3 py-2 bg-gray-800 rd border border-gray-700 text-white col-span-2"
            onChange={(e) => setFilters(f => ({ ...f, sortBy: e.currentTarget.value as any }))}
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
                  onChange={(e) => setFilters(f => ({ ...f, hideHoneypots: e.currentTarget.checked }))}
                />
                <label for="hideHoneypots" class="text-white/90">Hide Honeypots</label>
              </div>

              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hideWarning"
                  checked={filters().hideWarning}
                  onChange={(e) => setFilters(f => ({ ...f, hideWarning: e.currentTarget.checked }))}
                />
                <label for="hideWarning" class="text-white/90">Hide Warning</label>
              </div>

              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hideDanger"
                  checked={filters().hideDanger}
                  onChange={(e) => setFilters(f => ({ ...f, hideDanger: e.currentTarget.checked }))}
                />
                <label for="hideDanger" class="text-white/90">Hide Danger</label>
              </div>
            </div>
          </div>

          {/* View Toggle Button */}
          <div class="col-span-1 flex justify-end">
            <button
              class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rd text-white transition-colors"
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
              {virtualizer.getVirtualItems().some(row => {
                const token = filteredTokens()[row.index];
                return token && expandedTokens().has(token.tokenAddress);
              }) ? 'Compact View' : 'Detailed View'}
            </button>
          </div>
        </div>
      </div>

      {/* Virtual List Container */}
      <div ref={parentRef} class="relative w-full">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
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
                  padding: '4px'
                }}
              >
                {!isExpanded ? (
                  <CompactRow token={token} />
                ) : (
                  <div class="w-full h-full bg-black/40 backdrop-blur-sm rd-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                    <div class="p-8">
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
      
      {/* Debug info */}
      <div class="sticky bottom-4 mt-12 p-4 bg-black/80 text-white/60 text-sm rd-lg">
        Total tokens: {props.tokens.length}, Filtered: {filteredTokens().length}
      </div>
    </div>
  );
};
