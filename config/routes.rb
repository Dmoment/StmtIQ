Rails.application.routes.draw do
  # Mount Grape API
  mount BaseAPI => '/api'

  # Letter Opener Web - view sent emails in development
  if Rails.env.development?
    mount LetterOpenerWeb::Engine, at: '/letter_opener'
  end

  # SSE endpoint for statement progress (must be before catch-all route)
  namespace :api do
    namespace :v1 do
      get 'statements/:id/progress/stream', to: 'statement_progress#stream'
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  # Landing page (server-side rendered for SEO)
  root "pages#landing"

  # React SPA routes - serve React app for authenticated routes
  get 'app', to: 'home#index', as: :app_root
  get 'app/*path', to: 'home#index'

  # Auth routes (React handles these)
  get 'login', to: 'home#index'
  get 'signup', to: 'home#index'
  get 'verify', to: 'home#index'

  # Catch-all for any other React routes
  get '*path', to: 'home#index', constraints: ->(req) {
    !req.path.start_with?('/api', '/rails') &&
    req.format.html?
  }
end
