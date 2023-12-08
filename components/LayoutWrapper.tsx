'use client'
import siteMetadata from '@/data/siteMetadata'
import { Inter } from 'next/font/google'
import { ReactNode, useEffect } from 'react'
import Footer from './Footer'
import Header from './Header'

import PageLogin from '@/components/PageLogin'
import { SearchConfig, SearchProvider } from 'pliny/search'
import { useAppProvider } from 'provider/AppProvider'
import ForgetPass from './ForgetPass'
import ResetForm from './ResetForm'

import QuestionForm from './QuestionForm'
import Stepper from './stepper/Stepper'
import { HTTPClient } from '@/lib/axios'
import Cookies from 'js-cookie'

interface Props {
  children: ReactNode
}

const inter = Inter({
  subsets: ['latin'],
})

const Wrapper = ({ children }: Props) => {
  const appProviderContext = useAppProvider()

  if (!appProviderContext) {
    return <div>Loading...</div>
  }
  const {
    login,
    setLogin,
    setHasTicket,
    hasTicket,
    showSplash,
    setShowSplash,
    isForget,
    setIsForget,
    isRestForm,
    setIsRestForm,
    authToken,
    setAuthToken,
    email,
    setEmail,
    setCurrentStep,
  } = appProviderContext

  const checkRoute = () => {
    setShowSplash(false)
  }
  useEffect(() => {
    const authToken = Cookies.get('auth_token')
    if (authToken && typeof authToken === 'string' && authToken.length) {
      setAuthToken(authToken)
    }
    const email = localStorage.getItem('email')
    if (email && typeof email === 'string' && email.length) {
      setEmail(email)
    }
  }, [])

  useEffect(() => {
    let executeTimeout
    ;(async () => {
      if (authToken && authToken.length && email && email.length) {
        // Check auth token
        const res = (
          await HTTPClient.getInstance().client.get('tickets/search', {
            params: {
              query: `Steps Ticket for Customer ${email}`,
            },
            headers: {
              Authorization: `Token token=${authToken}`,
            },
          })
        ).data
        if (res.tickets) {
          setLogin(true)
        }
        if (res.assets.Ticket) {
          const ticket = Object.values(res.assets.Ticket)[0] as any

          const execute = async () => {
            const tagRes = await HTTPClient.getInstance().client.get(
              `tags?object=Ticket&o_id=${ticket.id}`,
              {
                headers: {
                  Authorization: `Token token=${authToken}`,
                },
              }
            )
            const { tags } = tagRes.data
            let step = 0

            for (let i = 5; i >= 1; --i) {
              if (tags.find((tag) => tag == `step_${i}`)) {
                step = i
                break
              }
            }
            if (ticket.close_at) {
              step = 5
            }

            setCurrentStep(step)

            executeTimeout = setTimeout(execute, 30 * 1000)
          }
          await execute()

          showStepper()
        }
      }
    })()
    return () => {
      clearTimeout(executeTimeout)
    }
  }, [authToken && authToken.length && email && email.length])

  const checkRouteQuestion = () => {
    setShowSplash(true)
    setHasTicket(true)
  }

  const loginCheck = async (username: string, password: string) => {
    const auth = {
      auth: {
        username,
        password,
      },
    }
    const access_tokens = (await HTTPClient.getInstance().client.get('user_access_token', auth))
      .data
    const found_access_token = access_tokens.tokens.find((token) => token.name == 'zammad-login')
    const res = await Promise.all([
      HTTPClient.getInstance().client.post(
        `user_access_token`,
        {
          name: 'zammad-login',
          permission: ['admin.ticket', 'ticket.agent', 'admin.tag'],
        },
        auth
      ),
      found_access_token &&
        HTTPClient.getInstance().client.delete(`user_access_token/${found_access_token.id}`, auth),
    ])

    setAuthToken(res[0].data.token)
    setEmail(username)
    Cookies.set('auth_token', res[0].data.token)
    localStorage.setItem('email', username)

    if (!hasTicket) {
      setShowSplash(false)
    }
  }
  const forgetPassFunc = () => {
    setIsRestForm(true)
    console.log('Rest Btn')
    setIsForget(false)
  }

  if (login === null) {
    return <div>Loading</div>
  }

  const showStepper = () => {
    setShowSplash(true)
    setHasTicket(true)
    console.log('showStepper ::', showSplash)
  }

  const forgetPassHandler = () => {
    setIsForget(true)
  }

  const redirectToLogin = () => {
    setIsForget(false)
    console.log('Redirect')
  }

  const restFormFunc = () => {
    setIsRestForm(false)
    setIsForget(false)
    console.log('Rest Btn', isRestForm)
  }

  if (!login) {
    if (isForget) {
      return <ForgetPass loginCheck={forgetPassFunc} forgetPassHandler={redirectToLogin} />
    } else if (isRestForm) {
      return <ResetForm loginCheck={restFormFunc} />
    } else {
      return (
        <div className="mt-30 container h-full pt-20">
          <PageLogin loginCheck={loginCheck} forgetPassHandler={forgetPassHandler} />
          {/* <Stepper checkerRoute={checkRoute} /> */}
        </div>
      )
    }
  }

  // Handle the case when login is true here, if needed
  // return some component or null based on your requirement

  if (login && !hasTicket) {
    return (
      <div className=" w-full">
        <QuestionForm checkerRoute={checkRouteQuestion} />
      </div>
    )
  }
  return (
    <div>
      {showSplash ? (
        <>
          <Stepper checkerRoute={checkRoute} />
        </>
      ) : (
        <div className="flex h-screen flex-col justify-between ">
          <SearchProvider searchConfig={siteMetadata.search as SearchConfig}>
            <Header />
            <main className="mb-auto">{children}</main>
          </SearchProvider>
          <Footer />
        </div>
      )}
    </div>
  )
}

export default Wrapper
