import '@testing-library/jest-dom/vitest'

import { cleanup } from '@solidjs/testing-library'
import { afterEach,vi } from 'vitest'

afterEach(cleanup)

vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

vi.stubGlobal('browser', {
  storage: {
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  windows: {
    getCurrent: vi.fn().mockResolvedValue({ id: 1 }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
})
