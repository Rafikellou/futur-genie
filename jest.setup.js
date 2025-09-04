import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// // Mock Supabase client
// jest.mock('@supabase/supabase-js', () => ({
//   createClient: jest.fn(() => ({
//     auth: {
//       getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
//       getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
//       signInWithPassword: jest.fn(async () => ({ data: { user: { id: 'test-user-id' } }, error: null })),
//       signUp: jest.fn(async () => ({ data: { user: { id: 'test-user-id' } }, error: null })),
//       signOut: jest.fn(async () => ({ error: null })),
//       onAuthStateChange: jest.fn(),
//       admin: {
//         createUser: jest.fn(async () => ({ data: { user: { id: 'test-user-id' } }, error: null })),
//         updateUserById: jest.fn(async () => ({ data: { user: { id: 'test-user-id' } }, error: null })),
//         deleteUser: jest.fn(async () => ({ data: {}, error: null })),
//       },
//     },
//     from: jest.fn(() => ({
//       select: jest.fn(() => ({
//         eq: jest.fn(() => ({
//           data: [],
//           error: null,
//         })),
//         gt: jest.fn(() => ({
//           is: jest.fn(() => ({
//             single: jest.fn(() => ({ data: null, error: null })),
//           })),
//         })),
//         order: jest.fn(() => ({
//           data: [],
//           error: null,
//         })),
//         limit: jest.fn(() => ({
//           data: [],
//           error: null,
//         })),
//         single: jest.fn(() => ({
//           data: null,
//           error: null,
//         })),
//       })),
//       insert: jest.fn(() => ({
//         select: jest.fn(() => ({
//           single: jest.fn(() => ({
//             data: null,
//             error: null,
//           })),
//         })),
//       })),
//       upsert: jest.fn(() => ({
//         select: jest.fn(() => ({
//           single: jest.fn(() => ({ data: null, error: null })),
//         })),
//       })),
//       update: jest.fn(() => ({
//         eq: jest.fn(() => ({
//           select: jest.fn(() => ({
//             single: jest.fn(() => ({
//               data: null,
//               error: null,
//             })),
//           })),
//         })),
//       })),
//       delete: jest.fn(() => ({
//         eq: jest.fn(() => ({
//           data: null,
//           error: null,
//         })),
//       })),
//     })),
//   })),
// }))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}