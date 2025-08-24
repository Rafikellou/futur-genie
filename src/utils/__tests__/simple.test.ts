// Simple test to verify testing infrastructure works
describe('Testing Infrastructure', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    const result = await promise
    expect(result).toBe('success')
  })

  it('should mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  it('should handle arrays and objects', () => {
    const testArray = [1, 2, 3]
    const testObject = { name: 'test', value: 123 }

    expect(testArray).toHaveLength(3)
    expect(testArray).toContain(2)
    expect(testObject).toHaveProperty('name', 'test')
    expect(testObject).toMatchObject({ name: 'test' })
  })

  it('should handle string operations', () => {
    const testString = 'Hello World'
    expect(testString).toMatch(/Hello/)
    expect(testString).toContain('World')
    expect(testString.toLowerCase()).toBe('hello world')
  })
})