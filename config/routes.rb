Rails.application.routes.draw do
  # Mount Grape API
  mount BaseAPI => '/api'

  # SSE endpoint for statement progress (must be before catch-all route)
  namespace :api do
    namespace :v1 do
      get 'statements/:id/progress/stream', to: 'statement_progress#stream'
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  # SPA - serve React app for all other routes (HTML only)
  root "home#index"
  get '*path', to: 'home#index', constraints: ->(req) {
    !req.path.start_with?('/api', '/rails') &&
    req.format.html?
  }
end
