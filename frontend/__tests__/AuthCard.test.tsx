import { render, screen } from '@testing-library/react'
import { AuthCard } from '@/components/layout/AuthCard'

describe('AuthCard', () => {
  it('renders title', () => {
    render(<AuthCard title="Sign in">child</AuthCard>)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<AuthCard title="Sign in" subtitle="Welcome back">child</AuthCard>)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<AuthCard title="Sign in"><button>Submit</button></AuthCard>)
    expect(screen.getByText('Submit')).toBeInTheDocument()
  })

  it('renders logo wordmark', () => {
    render(<AuthCard title="Sign in">child</AuthCard>)
    expect(screen.getByText('Lucy Apply')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    render(<AuthCard title="Sign in">child</AuthCard>)
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument()
  })
})
