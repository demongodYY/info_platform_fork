import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

/**
 * Vue 组件测试示例
 * 这是一个测试示例文件，展示如何测试 Vue 组件
 */

// 示例组件
const ExampleComponent = defineComponent({
  name: 'ExampleComponent',
  props: {
    message: {
      type: String,
      default: 'Hello',
    },
  },
  template: `
    <div>
      <h1>{{ message }}</h1>
      <button @click="count++">Click me</button>
      <p>Count: {{ count }}</p>
    </div>
  `,
  data() {
    return {
      count: 0,
    }
  },
})

describe('ExampleComponent', () => {
  it('应该渲染组件', () => {
    const wrapper = mount(ExampleComponent, {
      props: {
        message: 'Test Message',
      },
    })

    expect(wrapper.text()).toContain('Test Message')
    expect(wrapper.find('h1').text()).toBe('Test Message')
  })

  it('应该更新计数', async () => {
    const wrapper = mount(ExampleComponent)

    expect(wrapper.text()).toContain('Count: 0')

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Count: 1')
  })
})
