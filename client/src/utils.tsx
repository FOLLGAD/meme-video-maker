export function removeNamespace(key: string): string {
    return key.slice(key.lastIndexOf("/") + 1)
}
