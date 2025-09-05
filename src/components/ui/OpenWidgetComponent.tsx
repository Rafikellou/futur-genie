'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    __ow?: any
    OpenWidget?: any
  }
}

export function OpenWidgetComponent() {
  useEffect(() => {
    // Initialize OpenWidget
    if (typeof window !== 'undefined') {
      window.__ow = window.__ow || {}
      window.__ow.organizationId = "d57d9575-0cab-4d8d-bdda-f028cfb11a9f"
      window.__ow.integration_name = "manual_settings"
      window.__ow.product_name = "openwidget"
      
      // Load the OpenWidget script
      const script = document.createElement('script')
      script.async = true
      script.type = 'text/javascript'
      script.src = 'https://cdn.openwidget.com/openwidget.js'
      
      // Initialize OpenWidget function
      const initOpenWidget = () => {
        function i(n: any) {
          return e._h ? e._h.apply(null, n) : e._q.push(n)
        }
        
        const e: any = {
          _q: [],
          _h: null,
          _v: "2.0",
          on: function() { i(["on", Array.prototype.slice.call(arguments)]) },
          once: function() { i(["once", Array.prototype.slice.call(arguments)]) },
          off: function() { i(["off", Array.prototype.slice.call(arguments)]) },
          get: function() {
            if (!e._h) throw new Error("[OpenWidget] You can't use getters before load.")
            return i(["get", Array.prototype.slice.call(arguments)])
          },
          call: function() { i(["call", Array.prototype.slice.call(arguments)]) },
          init: function() {
            document.head.appendChild(script)
          }
        }
        
        if (!window.__ow.asyncInit) {
          e.init()
        }
        
        window.OpenWidget = window.OpenWidget || e
      }
      
      initOpenWidget()
    }
  }, [])

  return (
    <div className="relative h-full min-h-[600px] bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-8">
      <div className="text-center text-slate-400">
        <p>Outil de feedback en cours de chargement...</p>
        <noscript>
          <p>
            Vous devez{' '}
            <a 
              href="https://www.openwidget.com/enable-javascript" 
              rel="noopener nofollow"
              className="text-blue-400 hover:text-blue-300"
            >
              activer JavaScript
            </a>{' '}
            pour utiliser l'outil de communication fourni par{' '}
            <a 
              href="https://www.openwidget.com/" 
              rel="noopener nofollow" 
              target="_blank"
              className="text-blue-400 hover:text-blue-300"
            >
              OpenWidget
            </a>
          </p>
        </noscript>
      </div>
    </div>
  )
}
