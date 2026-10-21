<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ source?: string }>()
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!) }
function safeHref(value: string) {
  try { const url = new URL(value, location.origin); return url.origin === location.origin && value.startsWith('/') && !value.startsWith('//') || ['http:', 'https:'].includes(url.protocol) ? escapeHtml(value) : '' }
  catch { return '' }
}
function inline(value: string) {
  let result = escapeHtml(value)
  result = result.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)/g, (_all, alt: string, url: string) => {
    const href = safeHref(url)
    return href ? `<img class="markdown-image" src="${href}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">` : escapeHtml(`![${alt}](${url})`)
  })
  result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)/g, (_all, label: string, url: string) => {
    const href = safeHref(url)
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label
  })
  return result.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
}
const html = computed(() => {
  const source = props.source?.trim() || ''
  const blocks = source.split(/\n\s*\n/)
  return blocks.map(block => {
    const code = block.match(/^```[\w-]*\s*\n([\s\S]*?)\n```$/)
    if (code) return `<pre><code>${escapeHtml(code[1]!)}</code></pre>`
    const heading = block.match(/^(#{1,6})\s+(.+)$/)
    if (heading) { const level = heading[1]!.length; return `<h${level}>${inline(heading[2]!)}</h${level}>` }
    if (/^(?:[-*]\s+.+\n?)+$/.test(block)) return `<ul>${block.split('\n').filter(Boolean).map(item => `<li>${inline(item.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`
    return `<p>${block.split('\n').map(inline).join('<br>')}</p>`
  }).join('')
})
</script>

<template><div class="markdown-content" v-html="html" /></template>

<style>
.markdown-content{line-height:1.8;color:var(--muted);overflow-wrap:anywhere}.markdown-content h1,.markdown-content h2,.markdown-content h3{margin:18px 0 8px;color:var(--text,#343046)}.markdown-content p,.markdown-content ul,.markdown-content pre{margin:10px 0}.markdown-content ul{padding-left:24px}.markdown-content li{padding:2px 0}.markdown-content pre{overflow:auto;padding:14px 16px;border-radius:10px;background:#f5f3fa;color:#413b50;line-height:1.6}.markdown-content code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#f3f0f8;border-radius:4px;padding:1px 4px}.markdown-content pre code{background:transparent;padding:0}.markdown-image{display:block;max-width:min(100%,520px);max-height:360px;object-fit:contain;margin:12px auto;border-radius:12px}.markdown-content a{color:#5c4bc2;text-decoration:underline}
</style>
