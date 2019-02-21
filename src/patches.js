import {each} from "./common"

export function generatePatches(state, basePath, patches, inversePatches) {
    Array.isArray(state.base)
        ? generateArrayPatches(state, basePath, patches, inversePatches)
        : generateObjectPatches(state, basePath, patches, inversePatches)
}

function _generateArrayPatches(base, copy, basePath, patches, inversePatches) {
    if (copy.length < base.length) {
        return _generateArrayPatches(
            copy,
            base,
            basePath,
            inversePatches,
            patches
        )
    }

    const delta = copy.length - base.length

    let start = 0
    while (base[start] === copy[start] && start < base.length) {
        ++start
    }

    let baseEnd = base.length
    while (baseEnd > start && base[baseEnd - 1] === copy[baseEnd + delta - 1]) {
        --baseEnd
    }

    const replaceCount = baseEnd - start
    for (let i = 0; i < replaceCount; ++i) {
        const path = basePath.concat([start + i])
        if (copy[start + i] !== base[start + i]) {
            patches.push({
                op: "replace",
                path,
                value: copy[start + i]
            })
            inversePatches.push({
                op: "replace",
                path,
                value: base[start + i]
            })
        }
    }
    start += replaceCount

    const useRemove = start != base.length
    for (let j = 0; j < delta; ++j) {
        const path = basePath.concat([start + j])
        patches.push({
            op: "add",
            path,
            value: copy[start + j]
        })
        if (useRemove) {
            inversePatches.unshift({
                op: "remove",
                path
            })
        }
    }

    if (!useRemove) {
        inversePatches.push({
            op: "replace",
            path: basePath.concat(["length"]),
            value: base.length
        })
    }

    return true
}

function generateArrayPatches(state, basePath, patches, inversePatches) {
    return _generateArrayPatches(
        state.base,
        state.copy,
        basePath,
        patches,
        inversePatches
    )
}

function generateObjectPatches(state, basePath, patches, inversePatches) {
    const {base, copy} = state
    each(state.assigned, (key, assignedValue) => {
        const origValue = base[key]
        const value = copy[key]
        const op = !assignedValue ? "remove" : key in base ? "replace" : "add"
        if (origValue === value && op === "replace") return
        const path = basePath.concat(key)
        patches.push(op === "remove" ? {op, path} : {op, path, value})
        inversePatches.push(
            op === "add"
                ? {op: "remove", path}
                : op === "remove"
                ? {op: "add", path, value: origValue}
                : {op: "replace", path, value: origValue}
        )
    })
}

export function applyPatches(draft, patches) {
    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i]
        const {path} = patch
        if (path.length === 0 && patch.op === "replace") {
            draft = patch.value
        } else {
            let base = draft
            for (let i = 0; i < path.length - 1; i++) {
                base = base[path[i]]
                if (!base || typeof base !== "object")
                    throw new Error("Cannot apply patch, path doesn't resolve: " + path.join("/")) // prettier-ignore
            }
            const key = path[path.length - 1]
            switch (patch.op) {
                case "replace":
                    base[key] = patch.value
                    break
                case "add":
                    if (Array.isArray(base)) {
                        base.splice(key, 0, patch.value)
                    } else {
                        // TODO: add support is not extensive, it does not support insertion or `-` atm!
                        base[key] = patch.value
                    }
                    break
                case "remove":
                    if (Array.isArray(base)) {
                        base.splice(key, 1)
                    } else {
                        delete base[key]
                    }
                    break
                default:
                    throw new Error("Unsupported patch operation: " + patch.op)
            }
        }
    }
    return draft
}
