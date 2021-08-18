import { GetStaticPaths, GetStaticProps } from "next";
import { useSession } from "next-auth/client";
import { RichText } from "prismic-dom";
import { getPrismicClient } from "../../../services/prismic";
import Link from 'next/link';
import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

import styles from '../post.module.scss';

interface PostPreviewProps {
  post: {
    slug: string;
    title: string;
    content: string;
    updatedAt: string;
  }
}

export default function Preview({ post }: PostPreviewProps) {
  const [session] = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.activeSubscription) {
      router.push(`/posts/${post.slug}`)
    }
  }, [session])

  return (
    <>
      <Head>
        <title>{post.title} | Ignews</title>
      </Head>

      <main className={styles.container}>
        <article className={styles.post}>
          <h1>{post.title}</h1>
          <time>{post.updatedAt}</time>
          <div
            className={`${styles.postContent} ${styles.previewContent}`}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          <div className={styles.continueReading}>
            Wanna continue reading?
            <Link href='/'>
              <a>Subscribe now 😎</a>
            </Link>
          </div>
        </article>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {

  return {
    paths: [
      // { params: { slug: 'mapas-com-react-usando-leaflet' } } //Gera as paginas citadas de forma estatica (necessario parametrização de paginas)
    ],
    fallback: 'blocking' // true(carrega o conteudo pelo lado do browser), false(Se o conteudo não foi gerado de forma estatica(colocado no paths:[]) ainda volta 404), blocking(Só mostra o html após carregar o conteudo no next *ServerSideRendering*)
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient()

  const response = await prismic.getByUID('post', String(slug), {})

  const post = {
    slug,
    title: RichText.asText(response.data.title),
    content: RichText.asHtml(response.data.content.splice(0, 3)), //Pega os 3 primeiros blocos do conteudo
    updatedAt: new Date(response.last_publication_date).toLocaleDateString('pt-br', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  };

  return {
    props: {
      post,
    },
    redirect: 60 * 30, //30 minutos
  }
}