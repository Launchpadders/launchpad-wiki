import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { AlsUploadAnalyzer } from '@/app/components/AlsUploadAnalyzer';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    AlsUploadAnalyzer,
    ...components,
  };
}
