import { Component, Show, createSignal, onMount } from 'solid-js';
import { Shield, Info, Activity, FileText, Lock, Users } from 'lucide-solid';
import type { Token, TokenCardProps } from '../types';
import { TokenChart } from './TokenLiquidityChart';

const securityStatus = {
  safe: 'bg-green-100 text-green-800 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  danger: 'bg-red-100 text-red-800 border border-red-200'
} as const;

const SectionHeader: Component<{ icon: any; title: string }> = (props) => (
  <div class="flex items-center gap-2 mb-2 border-b border-gray-700/50 pb-2">
    {props.icon}
    <h4 class="text-base fw-600 text-white">{props.title}</h4>
  </div>
);

const Field: Component<{ label: string; value: any; truncate?: boolean }> = (props) => (
  <div class="mb-1">
    <span class="text-xs fw-500 text-gray-400">{props.label}: </span>
    <span class={`text-xs text-gray-200 ${props.truncate ? 'truncate block' : ''}`}>
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

export const TokenEventCard: Component<TokenCardProps> = (props) => {
  const [history, setHistory] = createSignal<TokenHistory[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      console.log('Fetching history for token:', props.token.tokenAddress);
      const response = await fetch(`/api/tokens/${props.token.tokenAddress}/history`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Log raw response text for debugging
      const rawText = await response.text();
      console.log('Raw response:', rawText);
      
      try {
        const data = JSON.parse(rawText);
        console.log('Parsed data:', data);
        
        if (!data.history || !Array.isArray(data.history)) {
          throw new Error('Invalid history data received');
        }

        setHistory(data.history);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse response as JSON');
      }
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
    <div class="flex flex-col gap-6">
      {/* Token Info Section */}
      <div class="space-y-4">
        {/* Warning Reasons */}
        <Show when={getWarningReasons().length > 0}>
          <div class="bg-orange-100/10 p-4 rd">
            <div class="flex items-center gap-2 mb-2">
              <Info size={16} class="text-orange-400" />
              <h3 class="text-base fw-600 text-orange-400">Warning Reasons</h3>
            </div>
            <ul class="list-disc list-inside space-y-1">
              {getWarningReasons().map(reason => (
                <li class="text-orange-200 text-sm">{reason}</li>
              ))}
            </ul>
          </div>
        </Show>

        {/* Trading Info */}
        <div>
          <SectionHeader icon={<Activity size={16} class="text-blue-400" />} title="Trading Information" />
          <div class="grid grid-cols-3 gap-4">
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
          </div>
        </div>

        {/* Contract Info */}
        <div>
          <SectionHeader icon={<FileText size={16} class="text-purple-400" />} title="Contract Information" />
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <Field label="Token Address" value={props.token.tokenAddress} truncate />
              <Field label="Pair Address" value={props.token.pairAddress} truncate />
              <Field label="Creator" value={props.token.gpCreatorAddress} truncate />
              <Field label="Owner" value={props.token.gpOwnerAddress || 'No owner'} truncate />
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

        {/* Security Settings */}
        <div>
          <SectionHeader icon={<Shield size={16} class="text-green-400" />} title="Security Settings" />
          <div class="grid grid-cols-2 gap-4">
            <Field label="Anti-Whale Modifiable" value={props.token.gpAntiWhaleModifiable ? 'Yes' : 'No'} />
            <Field label="Cannot Buy" value={props.token.gpCannotBuy ? 'Yes' : 'No'} />
            <Field label="Cannot Sell All" value={props.token.gpCannotSellAll ? 'Yes' : 'No'} />
            <Field label="Slippage Modifiable" value={props.token.gpSlippageModifiable ? 'Yes' : 'No'} />
            <Field label="Personal Slippage Modifiable" value={props.token.gpPersonalSlippageModifiable ? 'Yes' : 'No'} />
            <Field label="Trading Cooldown" value={props.token.gpTradingCooldown ? 'Yes' : 'No'} />
          </div>
        </div>

        {/* Holder Information */}
        <div>
          <SectionHeader icon={<Users size={16} class="text-indigo-400" />} title="Holder Information" />
          <div class="grid grid-cols-2 gap-4">
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

        {/* Additional Information */}
        <div>
          <SectionHeader icon={<Info size={16} class="text-yellow-400" />} title="Additional Information" />
          <div class="grid grid-cols-2 gap-4">
            <Field label="Status" value={props.token.status || 'N/A'} />
            <Field label="Last Error" value={props.token.lastError || 'None'} />
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
      </div>

      {/* Charts Section */}
      <div class="space-y-4">
        {/* Liquidity Chart */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Activity size={16} class="text-blue-400" />
            <h3 class="text-base fw-600 text-white">Liquidity History</h3>
            <span class="text-xs text-gray-400">
              (Trend: {(() => {
                const historyData = history();
                if (!historyData || historyData.length < 2) return 'stagnant';
                const data = historyData.map(record => ({
                  x: new Date(record.timestamp),
                  y: record.totalLiquidity
                }));
                const xPoints = data.map((_, i) => i);
                const yPoints = data.map(d => d.y);
                const xMean = xPoints.reduce((a, b) => a + b, 0) / xPoints.length;
                const yMean = yPoints.reduce((a, b) => a + b, 0) / yPoints.length;
                const slope = xPoints.reduce((acc, x, i) => {
                  return acc + (x - xMean) * (yPoints[i] - yMean);
                }, 0) / xPoints.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
                const threshold = 0.01 * yMean;
                if (Math.abs(slope) < threshold) return 'stagnant';
                return slope > 0 ? 'up' : 'down';
              })()})
            </span>
          </div>
          <div class="h-[200px] bg-black/20 rd p-2">
            <TokenChart token={props.token} history={history()} type="liquidity" />
          </div>
        </div>

        {/* Holders Chart */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Users size={16} class="text-indigo-400" />
            <h3 class="text-base fw-600 text-white">Holders History</h3>
            <span class="text-xs text-gray-400">
              (Trend: {(() => {
                const historyData = history();
                if (!historyData || historyData.length < 2) return 'stagnant';
                const data = historyData.map(record => ({
                  x: new Date(record.timestamp),
                  y: record.holderCount
                }));
                const xPoints = data.map((_, i) => i);
                const yPoints = data.map(d => d.y);
                const xMean = xPoints.reduce((a, b) => a + b, 0) / xPoints.length;
                const yMean = yPoints.reduce((a, b) => a + b, 0) / yPoints.length;
                const slope = xPoints.reduce((acc, x, i) => {
                  return acc + (x - xMean) * (yPoints[i] - yMean);
                }, 0) / xPoints.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
                const threshold = 0.01 * yMean;
                if (Math.abs(slope) < threshold) return 'stagnant';
                return slope > 0 ? 'up' : 'down';
              })()})
            </span>
          </div>
          <div class="h-[200px] bg-black/20 rd p-2">
            <TokenChart token={props.token} history={history()} type="holders" />
          </div>
        </div>
      </div>

      {/* Liquidity History Table */}
      <div class="space-y-2">
        <div class="bg-black/20 p-4 rd">
          {isLoading() ? (
            <div class="text-gray-400">Loading history...</div>
          ) : error() ? (
            <div class="text-red-400">{error()}</div>
          ) : history().length === 0 ? (
            <div class="text-gray-400">No history available</div>
          ) : (
            <div class="max-h-[200px] overflow-y-auto">
              <table class="w-full">
                <thead class="sticky top-0 bg-black/80">
                  <tr class="text-gray-400 text-xs">
                    <th class="text-left py-2 px-2">Time</th>
                    <th class="text-right py-2 px-2">Liquidity</th>
                    <th class="text-right py-2 px-2">Holders</th>
                    <th class="text-right py-2 px-2">LP Holders</th>
                  </tr>
                </thead>
                <tbody class="text-xs">
                  {history().map((record) => (
                    <tr class="text-white border-t border-gray-800">
                      <td class="py-2 px-2">{new Date(record.timestamp).toLocaleString()}</td>
                      <td class="text-right py-2 px-2">${record.totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td class="text-right py-2 px-2">{record.holderCount.toLocaleString()}</td>
                      <td class="text-right py-2 px-2">{record.lpHolderCount.toLocaleString()}</td>
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
