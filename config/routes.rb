Rails.application.routes.draw do
  # Mount Grape API
  mount BaseAPI => '/api'

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  # SPA - serve React app for all other routes
  root "home#index"
  get '*path', to: 'home#index', constraints: ->(req) { !req.path.start_with?('/api', '/rails') }
end
