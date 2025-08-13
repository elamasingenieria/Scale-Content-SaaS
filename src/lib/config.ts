// Configuration constants
export const config = {
  stripe: {
    // Use test keys for development - move to production when ready
    publishableKey: 'pk_test_51RuwgfGW1LNDxvNy44eI4OVLRAwpZT6NXtAx5ba0yXPzbGRSlL7dDGQJLjNqt2FzO38qbLYQlswiN69LTSrjh9xP00sxy2lLiu',
    buyButtons: {
      subscription: 'buy_btn_1RvNvYGW1LNDxvNyGrhXnkxR',
      credits10: 'buy_btn_1RvOPaGW1LNDxvNyGD18efTA',
    }
  },
  supabase: {
    url: 'https://isgyytimeqyxyokarrds.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZ3l5dGltZXF5eHlva2FycmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjEyMjYsImV4cCI6MjA3MDQzNzIyNn0.9mn4tjhAf3TbQFOHuBTbp9LnQZBwcTqmkvgAgGyeAFw'
  }
} as const;