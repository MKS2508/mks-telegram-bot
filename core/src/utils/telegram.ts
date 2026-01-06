export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const threshold = 1024

  for (const unit of units) {
    if (bytes < threshold) {
      return `${bytes} ${unit}`
    }
    bytes /= threshold
  }

  return `${bytes.toFixed(2)} PB`
}

export function formatMemory(memory: {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
}): string {
  return `  RSS: ${formatBytes(memory.rss)}
  Heap Total: ${formatBytes(memory.heapTotal)}
  Heap Used: ${formatBytes(memory.heapUsed)}
  External: ${formatBytes(memory.external)}
  Array Buffers: ${formatBytes(memory.arrayBuffers)}`
}

export function getMemoryStats() {
  return process.memoryUsage()
}
