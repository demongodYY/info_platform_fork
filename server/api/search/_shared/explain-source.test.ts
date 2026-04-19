import { afterEach, describe, expect, it, vi } from 'vitest'
import { explainSource } from './explain-source'
import type { SourceExplainRequest } from '~/types/search'

const baseInput: SourceExplainRequest = {
  title: '庞贝病诊断与治疗的研究进展',
  sourceUrl: 'https://zgddek.com/article/pompe-progress',
  sourceLabel: 'zgddek.com',
  sourceDomain: 'zgddek.com',
  snippet: '介绍庞贝病诊断和治疗进展的文章',
}

describe('explainSource', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.BRAVE_API_KEY
  })

  it('returns unavailable when Brave API key is missing', async () => {
    const result = await explainSource(baseInput, {
      generateSummary: vi.fn(),
    })

    expect(result.status).toBe('unavailable')
    expect(result.summary).toBe('暂时无法解读')
  })

  it('matches the exact source URL and summarizes extracted snippets', async () => {
    process.env.BRAVE_API_KEY = 'brave-key'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          grounding: {
            generic: [
              {
                url: 'https://zgddek.com/article/pompe-progress',
                title: '庞贝病诊断与治疗的研究进展',
                snippets: ['这是第一段正文片段。', '这是第二段正文片段。'],
              },
              {
                url: 'https://zgddek.com/article/other',
                title: '其他文章',
                snippets: ['不该被选中的内容'],
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    const generateSummary = vi
      .fn()
      .mockResolvedValue('这篇文章主要在讲庞贝病最近有哪些诊断和治疗方向。')

    const result = await explainSource(baseInput, { generateSummary })

    expect(result.status).toBe('success')
    expect(result.summary).toContain('庞贝病')
    expect(result.matchedUrl).toBe(baseInput.sourceUrl)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.search.brave.com/res/v1/llm/context',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Subscription-Token': 'brave-key',
        }),
      })
    )
    expect(generateSummary).toHaveBeenCalledWith(expect.stringContaining('这是第一段正文片段'))
  })

  it('returns unavailable when Brave does not return a matching URL or fallback snippet', async () => {
    process.env.BRAVE_API_KEY = 'brave-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            grounding: {
              generic: [
                {
                  url: 'https://zgddek.com/article/another-page',
                  title: '别的文章',
                  snippets: ['没有命中当前来源链接'],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
    )

    const result = await explainSource(
      {
        ...baseInput,
        snippet: '',
      },
      {
        generateSummary: vi.fn(),
      }
    )

    expect(result.status).toBe('unavailable')
    expect(result.summary).toBe('暂时无法解读')
  })

  it('falls back to the supplied source snippet when Brave does not return a matching URL', async () => {
    process.env.BRAVE_API_KEY = 'brave-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            grounding: {
              generic: [
                {
                  url: 'https://zgddek.com/article/another-page',
                  title: '别的文章',
                  snippets: ['没有命中当前来源链接'],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
    )

    const generateSummary = vi
      .fn()
      .mockResolvedValue('这条来源主要在讲庞贝病诊断和治疗进展的大致信息。')

    const result = await explainSource(baseInput, {
      generateSummary,
    })

    expect(result.status).toBe('success')
    expect(result.matchedUrl).toBe(baseInput.sourceUrl)
    expect(generateSummary).toHaveBeenCalledWith(expect.stringContaining(baseInput.snippet))
  })
})
