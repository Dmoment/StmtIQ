# frozen_string_literal: true

class HomeController < ApplicationController
  def index
    # Only respond to HTML requests - JSON should go to API
    respond_to do |format|
      format.html { render :index }
      format.json { head :not_found }
    end
  end
end
