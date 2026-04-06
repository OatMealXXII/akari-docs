export type RouteKind = "static" | "param" | "catchall";

export interface RouteSegment {
  readonly raw: string;
  readonly kind: RouteKind;
  readonly value: string;
}

export interface RouteMeta {
  readonly title?: string;
  readonly description?: string;
  readonly order?: number;
}

export interface DocRoute {
  readonly id: string;
  readonly filePath: string;
  readonly relativePath: string;
  readonly routePath: string;
  readonly segments: readonly RouteSegment[];
  readonly isIndex: boolean;
  readonly meta: RouteMeta;
}

export interface RouteManifest {
  readonly contentRoot: string;
  readonly generatedAt: string;
  readonly routes: readonly DocRoute[];
}

export interface BuildRouteManifestOptions {
  readonly contentRoot: string;
  readonly includeMdx?: boolean;
}
