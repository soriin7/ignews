import { NextApiRequest, NextApiResponse } from "next"
import { query as q } from 'faunadb'
import { getSession } from 'next-auth/client'
import { stripe } from '../../services/stripe'
import { fauna } from "../../services/fauna"

type User = {
  ref: {
    id: string;
  },
  data: {
    stripe_customer_id: string;
  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const session = await getSession({ req })

    const user = await fauna.query<User>(
      q.Get(
        q.Match(
          q.Index('user_by_email'),
          q.Casefold(session.user.email)
        )
      )
    )

    let customerId = user.data.stripe_customer_id //pega o customer que ja existe no banco

    if (!customerId) {
      const stripeCustomer = await stripe.customers.create({ //se não existir cria novo customer
        email: session.user.email,
        // metadata
      })

      await fauna.query( // salva novo customer no banco
        q.Update(
          q.Ref(q.Collection('users'), user.ref.id),
          {
            data: {
              stripe_customer_id: stripeCustomer.id,
            }
          }
        )
      )

      customerId = stripeCustomer.id // reatribui a variavel para ela sempre ter um valor
    }



    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        { price: 'price_1IxkhPKTrLNbBK8Tnu6pylAp', quantity: 1 }
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL
    })

    return res.status(200).json({ sessionId: stripeCheckoutSession.id })
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not allowed')
  }
}