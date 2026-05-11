import { useState } from 'react';
import { getCoverSrc, getTitle } from '../utils/animeUtils';

export default function CoverArt({
  anime,
  src,
  alt,
  className = 'cover-media',
  imgClassName = 'cover-media__img',
  fallbackClassName = 'cover-media__ph',
  loading = 'lazy',
  decoding = 'async',
}) {
  const [errored, setErrored] = useState(false);
  const title = getTitle(anime);
  const resolvedSrc = src ?? getCoverSrc(anime);
  const showImage = resolvedSrc && !errored;

  return (
    <div className={`${className} ${showImage ? '' : 'is-fallback'}`.trim()}>
      {showImage ? (
        <img
          src={resolvedSrc}
          alt={alt ?? title}
          loading={loading}
          decoding={decoding}
          className={imgClassName}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className={fallbackClassName} aria-hidden="true">
          {(title || '?').charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
