import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { AlsUploadAnalyzer } from '@/app/components/AlsUploadAnalyzer';
import { LaunchpadSimulator } from '@/app/components/launchpad/LaunchpadSimulator';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    AlsUploadAnalyzer,
    LaunchpadSimulator,
    ...components,
  };
}
