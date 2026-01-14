# frozen_string_literal: true

module V1
  class Folders < Grape::API
    resource :folders do
      before { authenticate! }

      desc 'List folders with filtering'
      params do
        optional :parent_id, type: Integer, desc: 'Filter by parent folder (null for root)'
        optional :include_children, type: Boolean, default: false
      end
      get do
        require_workspace!

        folders = policy_scope(Folder).ordered

        if params.key?(:parent_id)
          folders = params[:parent_id].nil? ? folders.roots : folders.where(parent_id: params[:parent_id])
        else
          folders = folders.roots
        end

        present folders, with: V1::Entities::Folder, include_children: params[:include_children]
      end

      desc 'Get folder tree (nested structure)'
      get 'tree' do
        require_workspace!

        folders = policy_scope(Folder).roots.includes(:children).ordered
        present folders, with: V1::Entities::Folder, include_children: true
      end

      desc 'Create a new folder'
      params do
        requires :name, type: String
        optional :parent_id, type: Integer
        optional :description, type: String
        optional :color, type: String, values: %w[slate gray red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose]
        optional :icon, type: String
        optional :position, type: Integer
      end
      post do
        require_workspace!
        authorize Folder, :create?

        folder = current_workspace.folders.create!(
          declared(params, include_missing: false)
        )

        present folder, with: V1::Entities::Folder
      end

      desc 'Get folder details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        folder = policy_scope(Folder).find(params[:id])
        authorize folder, :show?

        present folder, with: V1::Entities::Folder, include_children: true
      end

      desc 'Update a folder'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :parent_id, type: Integer
        optional :description, type: String
        optional :color, type: String
        optional :icon, type: String
        optional :position, type: Integer
      end
      patch ':id' do
        require_workspace!

        folder = policy_scope(Folder).find(params[:id])
        authorize folder, :update?

        folder.update!(declared(params, include_missing: false).except(:id))

        present folder, with: V1::Entities::Folder
      end

      desc 'Delete a folder'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        folder = policy_scope(Folder).find(params[:id])
        authorize folder, :destroy?

        folder.destroy!

        { success: true, message: 'Folder deleted' }
      end

      desc 'List documents in folder'
      params do
        requires :id, type: Integer
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
      end
      get ':id/documents' do
        require_workspace!

        folder = policy_scope(Folder).find(params[:id])
        authorize folder, :show?

        documents = folder.documents.recent
        paginated = documents.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s

        present paginated, with: V1::Entities::Document
      end
    end
  end
end
