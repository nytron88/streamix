"use client";

import { useStreamKeys } from "@/hooks/useStreamKeys";
import { StreamKeysHeader } from "./StreamKeysHeader";
import { StreamKeysCard } from "./StreamKeysCard";
import { StreamKeysLoadingState } from "./StreamKeysLoadingState";
import { StreamKeysErrorState } from "./StreamKeysErrorState";

export function StreamKeys() {
  const {
    streamData,
    loading,
    error,
    generating,
    resetting,
    generateIngress,
    resetIngress,
    refetch,
  } = useStreamKeys();

  if (loading) return <StreamKeysLoadingState />;
  if (error) return <StreamKeysErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <StreamKeysHeader />
      <StreamKeysCard
        streamData={streamData}
        generating={generating}
        resetting={resetting}
        onGenerateIngress={generateIngress}
        onResetIngress={resetIngress}
      />
    </div>
  );
}
