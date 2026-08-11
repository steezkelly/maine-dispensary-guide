import type { APIRoute } from 'astro';
import optInData from '../../data/maine-opt-in-towns.json';

export const prerender = true;

export const GET: APIRoute = () => new Response(
  `${JSON.stringify(optInData, null, 2)}\n`,
  {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  },
);
