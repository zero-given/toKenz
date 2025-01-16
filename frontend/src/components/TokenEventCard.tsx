import { Component, Show, createSignal, onMount } from 'solid-js';
import { Shield, Info, Activity, FileText, Lock, Users } from 'lucide-solid';
import type { Token, TokenCardProps } from '../types';
import { TokenLiquidityChart } from './TokenLiquidityChart';

const securityStatus = {
  safe: 'bg-green-100 text-green-800 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  danger: 'bg-red-100 text-red-800 border border-red-200'
} as const;

const SectionHeader: Component<{ icon: any; title: string }> = (props) => (
  <div class="flex items-center gap-1.5 mb-2 border-b border-gray-200 pb-1">
    {props.icon}
    <h4 class="text-base fw-600 text-gray-800">{props.title}</h4>
  </div>
);

const Field: Component<{ label: string; value: any; truncate?: boolean }> = (props) => (
  <div class="mb-1">
    <span class="text-xs fw-500 text-gray-600">{props.label}: </span>
    <span class={`text-xs text-gray-800 ${props.truncate ? 'truncate block' : ''}`}>
      {props.value === undefined || props.value === null ? 'N/A' : props.value.toString()}
    </span>
  </div>
);

interface TokenHistory {
  timestamp: number;
  hpLiquidity: number;
  gpLiquidity: number;
  totalLiquidity: number;
  holderCount: number;
  lpHolderCount: number;
}

const API_BASE_URL = 'http://localhost:3002'; // Match the backend server URL

export const TokenEventCard: Component<TokenCardProps> = (props) => {
  const [history, setHistory] = createSignal<TokenHistory[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tokens/${props.token.tokenAddress}/history`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API response was not JSON');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token history');
      }

      const data = await response.json();
      if (!data.history || !Array.isArray(data.history)) {
        throw new Error('Invalid history data received');
      }

      console.log('Received history data:', data); // Debug log
      setHistory(data.history);
    } catch (err) {
      console.error('Error fetching token history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  });

  const getWarningReasons = () => {
    const reasons = [];
    
    // Contract security warnings
    if (!props.token.gpIsOpenSource) reasons.push('Contract is not open source');
    if (props.token.gpIsProxy) reasons.push('Contract uses proxy pattern');
    if (props.token.gpIsMintable) reasons.push('Token is mintable');
    if (props.token.gpHasProxyCalls) reasons.push('Contract has proxy calls');
    
    // Trading restrictions warnings
    if (props.token.gpCannotBuy) reasons.push('Buying is restricted');
    if (props.token.gpCannotSellAll) reasons.push('Cannot sell all tokens');
    if (props.token.gpTradingCooldown) reasons.push('Trading cooldown enabled');
    if (props.token.gpTransferPausable) reasons.push('Transfers can be paused');
    if (props.token.gpSlippageModifiable) reasons.push('Slippage can be modified');
    if (props.token.gpPersonalSlippageModifiable) reasons.push('Personal slippage can be modified');
    
    // Ownership warnings
    if (props.token.gpHiddenOwner) reasons.push('Hidden owner detected');
    if (props.token.gpCanTakeBackOwnership) reasons.push('Ownership can be taken back');
    if (props.token.gpOwnerChangeBalance) reasons.push('Owner can change balances');
    
    // Tax warnings
    if (props.token.gpBuyTax > 10) reasons.push(`High buy tax: ${props.token.gpBuyTax}%`);
    if (props.token.gpSellTax > 10) reasons.push(`High sell tax: ${props.token.gpSellTax}%`);
    
    // Additional risks
    if (props.token.gpIsAirdropScam) reasons.push('Potential airdrop scam');
    if (props.token.gpHoneypotWithSameCreator) reasons.push('Creator has deployed honeypots');
    if (props.token.gpFakeToken) reasons.push('Potential fake token');
    if (props.token.gpIsBlacklisted) reasons.push('Token is blacklisted');
    
    return reasons;
  };

  const warningReasons = getWarningReasons();

  return (
    <div class="bg-white rd-lg shadow-lg p-8 border border-gray-200 flex flex-col gap-6">
      {/* Header */}
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-2xl fw-700 text-gray-900 truncate">{props.token.tokenName}</h3>
          <p class="text-base text-gray-600 mt-1">{props.token.tokenSymbol}</p>
        </div>
        <div class={`px-4 py-2 rd-full text-base fw-600 flex-shrink-0 ${securityStatus[props.token.riskLevel]}`}>
          {props.token.riskLevel.toUpperCase()}
        </div>
      </div>

      {/* Security Info */}
      <div class="flex-none">
        <SectionHeader icon={<Shield size={20} />} title="Security Analysis" />
        <div class="mt-3">
          <Show when={props.token.hpIsHoneypot}>
            <div class="mb-3 p-3 bg-red-50 border border-red-200 rd text-red-700 text-base">
              ⚠️ HONEYPOT DETECTED: {props.token.hpHoneypotReason || 'Simulation failed'}
            </div>
          </Show>
          <Show when={warningReasons.length > 0}>
            <div class="space-y-2">
              {warningReasons.map(reason => (
                <div class="text-base text-yellow-700">⚠️ {reason}</div>
              ))}
            </div>
          </Show>
        </div>
      </div>

      {/* Contract Info */}
      <div class="flex-none">
        <SectionHeader icon={<FileText size={20} />} title="Contract Information" />
        <div class="mt-3 grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <Field label="Token Address" value={props.token.tokenAddress} truncate />
          </div>
          <div class="col-span-2">
            <Field label="Pair Address" value={props.token.pairAddress} truncate />
          </div>
          <div class="col-span-2">
            <Field label="Creator" value={props.token.gpCreatorAddress} truncate />
          </div>
          <div class="col-span-2">
            <Field label="Owner" value={props.token.gpOwnerAddress || 'No owner'} truncate />
          </div>
          <div class="col-span-2">
            <Field label="Deployer" value={props.token.hpDeployerAddress || 'N/A'} truncate />
          </div>
          <Field label="Age" value={`${props.token.tokenAgeHours.toFixed(1)} hours`} />
          <Field label="Decimals" value={props.token.tokenDecimals} />
          <Field label="Creation Time" value={new Date(Number(props.token.hpCreationTime) * 1000).toLocaleString()} />
          <Field label="Is Open Source" value={props.token.gpIsOpenSource ? 'Yes' : 'No'} />
          <Field label="Is Proxy" value={props.token.gpIsProxy ? 'Yes' : 'No'} />
          <Field label="Has Proxy Calls" value={props.token.gpHasProxyCalls ? 'Yes' : 'No'} />
          <Field label="Is Mintable" value={props.token.gpIsMintable ? 'Yes' : 'No'} />
          <Field label="Can Be Minted" value={props.token.gpCanBeMinted ? 'Yes' : 'No'} />
          <Field label="Self Destruct" value={props.token.gpSelfDestruct ? 'Yes' : 'No'} />
          <Field label="External Call" value={props.token.gpExternalCall ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Trading Info */}
      <div class="flex-none">
        <SectionHeader icon={<Activity size={20} />} title="Trading Information" />
        <div class="mt-3 grid grid-cols-3 gap-4">
          <Field label="Buy Tax" value={`${props.token.gpBuyTax}%`} />
          <Field label="Sell Tax" value={`${props.token.gpSellTax}%`} />
          <Field label="Transfer Tax" value={`${props.token.hpTransferTax}%`} />
          <Field label="Buy Gas" value={props.token.hpBuyGasUsed.toLocaleString()} />
          <Field label="Sell Gas" value={props.token.hpSellGasUsed.toLocaleString()} />
          <Field label="Total Supply" value={Number(props.token.gpTotalSupply).toLocaleString()} />
          <Field label="Liquidity Amount" value={`$${props.token.hpLiquidityAmount.toLocaleString()}`} />
          <Field label="Pair Token0" value={props.token.hpPairToken0Symbol || 'N/A'} />
          <Field label="Pair Token1" value={props.token.hpPairToken1Symbol || 'N/A'} />
          <Field label="Pair Reserves0" value={props.token.hpPairReserves0} />
          <Field label="Pair Reserves1" value={props.token.hpPairReserves1} />
          <Field label="Pair Liquidity" value={`$${props.token.hpPairLiquidity.toLocaleString()}`} />
          <Field label="Anti-Whale Modifiable" value={props.token.gpAntiWhaleModifiable ? 'Yes' : 'No'} />
          <Field label="Cannot Buy" value={props.token.gpCannotBuy ? 'Yes' : 'No'} />
          <Field label="Cannot Sell All" value={props.token.gpCannotSellAll ? 'Yes' : 'No'} />
          <Field label="Slippage Modifiable" value={props.token.gpSlippageModifiable ? 'Yes' : 'No'} />
          <Field label="Personal Slippage Modifiable" value={props.token.gpPersonalSlippageModifiable ? 'Yes' : 'No'} />
          <Field label="Trading Cooldown" value={props.token.gpTradingCooldown ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Holder Information */}
      <div class="flex-none">
        <SectionHeader icon={<Users size={20} />} title="Holder Information" />
        <div class="mt-3 grid grid-cols-2 gap-4">
          <Field label="Total Holders" value={props.token.gpHolderCount.toLocaleString()} />
          <Field label="LP Holders" value={props.token.gpLpHolderCount.toLocaleString()} />
          <Field label="Creator Balance" value={`${(Number(props.token.gpCreatorPercent) * 100).toFixed(2)}%`} />
          <Field label="Owner Balance" value={`${(Number(props.token.gpOwnerPercent) * 100).toFixed(2)}%`} />
          <Field label="Creator Balance Raw" value={props.token.gpCreatorBalance} />
          <Field label="Owner Balance Raw" value={props.token.gpOwnerBalance} />
          <Field label="LP Total Supply" value={props.token.gpLpTotalSupply} />
          <Field label="Total Scans" value={props.token.totalScans} />
          <Field label="Honeypot Failures" value={props.token.honeypotFailures} />
        </div>
      </div>

      {/* Additional Flags */}
      <div class="flex-none">
        <SectionHeader icon={<Info size={20} />} title="Additional Information" />
        <div class="mt-3 grid grid-cols-2 gap-4">
          <Field label="Anti-Whale" value={props.token.gpIsAntiWhale ? 'Yes' : 'No'} />
          <Field label="Whitelisted" value={props.token.gpIsWhitelisted ? 'Yes' : 'No'} />
          <Field label="In DEX" value={props.token.gpIsInDex ? 'Yes' : 'No'} />
          <Field label="True Token" value={props.token.gpIsTrueToken ? 'Yes' : 'No'} />
          <Field label="Is Airdrop Scam" value={props.token.gpIsAirdropScam ? 'Yes' : 'No'} />
          <Field label="Honeypot With Same Creator" value={props.token.gpHoneypotWithSameCreator ? 'Yes' : 'No'} />
          <Field label="Fake Token" value={props.token.gpFakeToken ? 'Yes' : 'No'} />
          <Field label="Can Take Back Ownership" value={props.token.gpCanTakeBackOwnership ? 'Yes' : 'No'} />
          <Field label="Owner Change Balance" value={props.token.gpOwnerChangeBalance ? 'Yes' : 'No'} />
          <Field label="Hidden Owner" value={props.token.gpHiddenOwner ? 'Yes' : 'No'} />
          <Field label="Transfer Pausable" value={props.token.gpTransferPausable ? 'Yes' : 'No'} />
          <Field label="Status" value={props.token.status || 'N/A'} />
          <Field label="Last Error" value={props.token.lastError || 'None'} />
          <Show when={props.token.gpNote}>
            <div class="col-span-2">
              <Field label="Notes" value={props.token.gpNote} />
            </div>
          </Show>
          <Show when={props.token.gpTrustList}>
            <div class="col-span-2">
              <Field label="Trust List" value={props.token.gpTrustList} />
            </div>
          </Show>
          <Show when={props.token.gpOtherPotentialRisks}>
            <div class="col-span-2">
              <Field label="Other Potential Risks" value={props.token.gpOtherPotentialRisks} />
            </div>
          </Show>
          <Show when={props.token.gpHolders}>
            <div class="col-span-2">
              <Field label="Holders" value={props.token.gpHolders} />
            </div>
          </Show>
          <Show when={props.token.gpLpHolders}>
            <div class="col-span-2">
              <Field label="LP Holders" value={props.token.gpLpHolders} />
            </div>
          </Show>
          <Show when={props.token.gpDexInfo}>
            <div class="col-span-2">
              <Field label="DEX Info" value={props.token.gpDexInfo} />
            </div>
          </Show>
        </div>
      </div>

      {/* Liquidity Chart */}
      <div class="flex-none">
        <SectionHeader icon={<Activity size={20} />} title="Liquidity History" />
        <div class="mt-3">
          <TokenLiquidityChart token={props.token} history={history()} />
        </div>
      </div>

      {/* Liquidity History */}
      <div class="mt-8">
        <div class="flex items-center gap-2 mb-4">
          <Activity size={18} class="text-blue-400" />
          <h3 class="text-lg fw-600 text-white">Liquidity History</h3>
        </div>
        <div class="bg-black/20 p-4 rd">
          {isLoading() ? (
            <div class="text-gray-400">Loading history...</div>
          ) : error() ? (
            <div class="text-red-400">{error()}</div>
          ) : history().length === 0 ? (
            <div class="text-gray-400">No history available</div>
          ) : (
            <div class="max-h-[300px] overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-black/80">
                  <tr class="text-gray-400">
                    <th class="text-left py-2">Time</th>
                    <th class="text-right py-2">Liquidity</th>
                    <th class="text-right py-2">Holders</th>
                    <th class="text-right py-2">LP Holders</th>
                  </tr>
                </thead>
                <tbody>
                  {history().map((record) => (
                    <tr class="text-white border-t border-gray-800">
                      <td class="py-2">{new Date(record.timestamp).toLocaleString()}</td>
                      <td class="text-right">${record.totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td class="text-right">{record.holderCount.toLocaleString()}</td>
                      <td class="text-right">{record.lpHolderCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
