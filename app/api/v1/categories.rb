# frozen_string_literal: true

module V1
  class Categories < Grape::API
    resource :categories do
      desc 'List all categories with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 50
        optional :q, type: Hash, desc: 'Ransack query params'
      end
      get do
        categories = Category.includes(:children)

        if params[:q].present?
          categories = categories.ransack(params[:q]).result(distinct: true)
        else
          categories = categories.root
        end

        paginate_collection(categories) do |category|
          V1::Entities::Category.represent(category)
        end
      end

      desc 'Get a single category'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        category = Category.find(params[:id])
        present category, with: V1::Entities::Category, full: true
      end

      desc 'Create a custom category'
      params do
        requires :name, type: String
        optional :icon, type: String
        optional :color, type: String
        optional :description, type: String
        optional :parent_id, type: Integer
      end
      post do
        authenticate!

        category = Category.create!(
          name: params[:name],
          slug: params[:name].parameterize,
          icon: params[:icon] || 'tag',
          color: params[:color] || '#64748b',
          description: params[:description],
          parent_id: params[:parent_id],
          is_system: false
        )

        present category, with: V1::Entities::Category
      end

      desc 'Update a category'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :icon, type: String
        optional :color, type: String
        optional :description, type: String
      end
      patch ':id' do
        authenticate!

        category = Category.find(params[:id])

        if category.is_system?
          error!({ error: 'Cannot modify system categories' }, 403)
        end

        category.update!(declared(params, include_missing: false).except(:id))
        present category, with: V1::Entities::Category
      end

      desc 'Delete a custom category'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        authenticate!

        category = Category.find(params[:id])

        if category.is_system?
          error!({ error: 'Cannot delete system categories' }, 403)
        end

        category.destroy!
        { success: true }
      end
    end
  end
end
