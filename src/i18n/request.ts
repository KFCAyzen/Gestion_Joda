import { getRequestConfig } from 'next-intl/server';
import { locales } from './config';
 
export default getRequestConfig(async ({ requestLocale }) => {
  // This function runs on the server for each request
  // Provide a static locale, as the user's preferences will be reflected in the routes
  const locale = (await requestLocale) || 'fr';
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});