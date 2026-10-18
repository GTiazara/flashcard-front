import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Avatar from '../../src/components/Avatar.vue'
import UiField from '../../src/components/UiField.vue'
import UiButton from '../../src/components/UiButton.vue'
describe('Composants communs', () => {
  it('associe label et erreur à leur champ', () => {
    const wrapper = mount(UiField, { props: { label: 'Votre nom', name: 'name', error: 'Obligatoire' } })
    expect(wrapper.get('label').attributes('for')).toBe('name')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('name-error')
    expect(wrapper.get('#name-error').text()).toBe('Obligatoire')
  })
  it('ne soumet pas implicitement les formulaires et bloque pendant le chargement', () => {
    const wrapper = mount(UiButton, { props: { busy: true }, slots: { default: 'Enregistrer' } })
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })
  it('utilise des initiales si la photo échoue et ignore les URL non HTTP', async () => {
    const wrapper = mount(Avatar, { props: { name: 'Camille Martin', url: 'https://images.invalid/avatar.png' } })
    await wrapper.get('img').trigger('error'); expect(wrapper.text()).toBe('CM')
    await wrapper.setProps({ url: 'javascript:alert(1)' }); expect(wrapper.find('img').exists()).toBe(false)
  })
})