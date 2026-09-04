// Mock API endpoints so offlineQueue tests don't need the full API stack
export const progress = {
  submit: () => Promise.resolve(),
}
