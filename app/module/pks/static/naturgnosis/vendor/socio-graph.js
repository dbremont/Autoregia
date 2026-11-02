/*!
 * SocioGraph — shared deck.gl renderer for Naturgnosis (edit.html & index.html).
 *
 * Pure functions: the page owns all state (cam, nodes, highlight flags, dirty
 * flags, the deck instance) and passes snapshots/refs as arguments. Nothing
 * global is mutated except canvases the page explicitly hands over for painting.
 * Requires window.SocioDeck (vendor/deck.min.js) for the deck.gl layer classes.
 */
(function () {
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

    const HEX = h => { h = (h || '#888').replace('#', ''); return h.length === 3 ? h.split('').map(c => c + c).join('') : h; };
    const rgbOf = hex => { const h = HEX(hex); return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; };

    function catRGB(getCategoryColor, category, cache) {
        if (cache[category]) return cache[category];
        const c = rgbOf(getCategoryColor(category));
        cache[category] = c;
        return c;
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }

    /* Bounding box of a layout.json-style map {id:[x,y]} with a sane fallback. */
    function layoutBounds(layoutData) {
        let minX = -300, minY = -300, maxX = 300, maxY = 300;
        if (layoutData) {
            let first = true;
            for (const id in layoutData) {
                const p = layoutData[id];
                if (!p || !isFiniteNum(p[0]) || !isFiniteNum(p[1])) continue;
                const x = p[0], y = p[1];
                if (first) { minX = maxX = x; minY = maxY = y; first = false; }
                else { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
            }
        }
        if (maxX - minX < 1) { minX = -300; maxX = 300; }
        if (maxY - minY < 1) { minY = -300; maxY = 300; }
        return { minX, minY, maxX, maxY };
    }

    /* Seed/refresh node x/y from layoutData; missing nodes get a random point
       within the layout bounds. Mutates nodes in place. */
    function applyLayoutToNodes(nodes, layoutData) {
        const b = layoutBounds(layoutData);
        for (const n of nodes) {
            const lp = layoutData && layoutData[n.id];
            if (lp && isFiniteNum(lp[0]) && isFiniteNum(lp[1])) { n.x = lp[0]; n.y = lp[1]; }
            else { n.x = b.minX + Math.random() * (b.maxX - b.minX); n.y = b.minY + Math.random() * (b.maxY - b.minY); }
            n.vx = 0; n.vy = 0;
        }
        return b;
    }

    function viewStateFromCam(cam, W, H) {
        const z = Math.max(1e-6, cam.z);
        return { target: [(W / 2 - cam.x) / z, (H / 2 - cam.y) / z, 0], zoom: Math.log2(z) };
    }

    function createDeck(lib, canvasEl, W, H) {
        return new lib.Deck({
            canvas: canvasEl,
            width: W, height: H,
            useDevicePixels: true,
            views: [new lib.OrthographicView({ id: 'ortho', controller: false })],
            controller: null,
            initialViewState: { target: [0, 0, 0], zoom: 0, minZoom: -10, maxZoom: 12 },
            layers: []
        });
    }

    /* ctx: { lib, cam, band, edges, nodeMap, hoveredNode, selectedNode,
       searchHighlights(Set), annotatedSet(Set), linkSourceNode, linkMode,
       nodeRadius(fn), getCategoryColor(fn), catCache(obj), edgeWeights,
       maxEdgeWeight, edgeShouldShow(fn), hexToRGBA(fn) } */
    function buildStaticLayers(ctx) {
        const lib = ctx.lib; if (!lib) return [];
        const { cam, band, edges, nodeMap, hoveredNode, selectedNode, searchHighlights,
            annotatedSet, linkSourceNode, linkMode, nodeRadius, getCategoryColor,
            catCache, edgeWeights, maxEdgeWeight, edgeShouldShow } = ctx;
        const z = cam.z;

        const edgesData = [];
        const incidentData = [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            const s = nodeMap[e.source], t = nodeMap[e.target];
            if (!s || !t) continue;
            const incident = (hoveredNode && (hoveredNode.id === e.source || hoveredNode.id === e.target)) ||
                (selectedNode && (selectedNode.id === e.source || selectedNode.id === e.target));
            if (!incident && !edgeShouldShow(i, band)) continue;
            const start = [s.x, s.y], end = [t.x, t.y];
            if (incident) {
                const ref = hoveredNode || selectedNode;
                const color = catRGB(getCategoryColor, ref.category, catCache).concat(235);
                incidentData.push({ start, end, color, width: clamp(1.6 * z, 1.6, 2.8) });
            } else {
                const w = edgeWeights[i];
                const baseA = clamp((w / maxEdgeWeight) * 0.3, 0.1, 0.3) * 255;
                const color = hoveredNode ? [90, 84, 74, 13] : [90, 84, 74, baseA | 0];
                edgesData.push({ start, end, color, width: clamp(0.75 * z, 0.4, 1.2) });
            }
        }
        if (incidentData.length) edgesData.push(...incidentData);

        const GILT = [168, 133, 74];
        const nodesLayer = new lib.ScatterplotLayer({
            id: 'nodes', data: ctx.nodes, pickable: true,
            getPosition: n => [n.x, n.y],
            getRadius: n => nodeRadius(n),
            radiusUnits: 'common', radiusScale: 1, radiusMinPixels: 2.4, radiusMaxPixels: 30,
            getFillColor: n => catRGB(getCategoryColor, n.category, catCache).concat(255),
            stroked: true,
            getLineColor: n => n === selectedNode ? GILT.concat(255) : (n === hoveredNode ? [44, 42, 38, 120] : [0, 0, 0, 0]),
            getLineWidth: n => n === selectedNode ? 1.5 : (n === hoveredNode ? 1 : 0),
            lineWidthUnits: 'pixels',
            parameters: { depthTest: false }
        });

        const glowData = [];
        ctx.nodes.forEach(n => {
            if (searchHighlights && searchHighlights.has(n.id)) glowData.push({ p: [n.x, n.y], r: nodeRadius(n) + 5, c: [63, 96, 146, 90] });
            if (n === linkSourceNode) glowData.push({ p: [n.x, n.y], r: nodeRadius(n) + 4, c: [107, 74, 122, 110] });
        });
        const glowLayer = glowData.length ? new lib.ScatterplotLayer({
            id: 'glow', data: glowData, pickable: false,
            getPosition: d => d.p, getRadius: d => d.r,
            radiusUnits: 'common', radiusScale: 1, radiusMinPixels: 2, radiusMaxPixels: 40,
            getFillColor: d => d.c, stroked: false, parameters: { depthTest: false }
        }) : null;

        // Gold ring marks nodes that carry curation notes (PKS layer).
        const annotatedData = [];
        if (annotatedSet && annotatedSet.size) {
            ctx.nodes.forEach(n => {
                if (annotatedSet.has(n.id)) annotatedData.push({ p: [n.x, n.y], r: nodeRadius(n) + 2.5 });
            });
        }
        const annotatedLayer = annotatedData.length ? new lib.ScatterplotLayer({
            id: 'annotated', data: annotatedData, pickable: false,
            getPosition: d => d.p, getRadius: d => d.r,
            radiusUnits: 'common', radiusScale: 1, radiusMinPixels: 2, radiusMaxPixels: 34,
            stroked: true, filled: false,
            getLineColor: [168, 133, 74, 235], getLineWidth: 1.4,
            lineWidthUnits: 'pixels', parameters: { depthTest: false }
        }) : null;

        const edgesLayer = new lib.LineLayer({
            id: 'edges', data: edgesData, pickable: false,
            getSourcePosition: d => d.start, getTargetPosition: d => d.end,
            getColor: d => d.color, getWidth: d => d.width,
            widthUnits: 'pixels', parameters: { depthTest: false }
        });

        const linkLayer = (linkMode && linkSourceNode && hoveredNode && linkSourceNode !== hoveredNode)
            ? new lib.LineLayer({
                id: 'link-preview', pickable: false,
                data: [{ s: [linkSourceNode.x, linkSourceNode.y], t: [hoveredNode.x, hoveredNode.y] }],
                getSourcePosition: d => d.s, getTargetPosition: d => d.t,
                getColor: [155, 126, 176, 128], getWidth: 1.6, widthUnits: 'pixels',
                parameters: { depthTest: false }
            }) : null;

        return [edgesLayer, nodesLayer, glowLayer, annotatedLayer, linkLayer].filter(Boolean);
    }

    /* Greedy screen-space decluttered labels.
       ctx: { lib, cam, W, H, nodes, band, labelTargetOpacity(fn), labelTiers,
       nodeDegrees, nodeRadius(fn), hoveredNode, selectedNode }
       Returns { layer, count }. */
    function buildLabelsLayer(ctx) {
        const lib = ctx.lib; if (!lib) return { layer: null, count: 0 };
        const { cam, W, H, nodes, band, labelTargetOpacity, labelTiers, nodeDegrees, nodeRadius, hoveredNode, selectedNode } = ctx;
        const z = cam.z;
        const fontSize = 11;
        const charW = fontSize * 0.56;
        const charH = fontSize * 1.25;

        const cand = [];
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const op = labelTargetOpacity(n, band);
            if (op < 0.02) continue;
            const tier = labelTiers[n.id] || 'micro';
            let pri = tier === 'always' ? 3 : tier === 'meso' ? 2 : 1;
            if (n === hoveredNode || n === selectedNode) pri = 4;
            cand.push({ n, op, pri, deg: nodeDegrees[n.id] || 0 });
        }
        cand.sort((a, b) => (b.pri - a.pri) || (b.deg - a.deg));

        const placed = [];
        const labelData = [];
        for (let i = 0; i < cand.length; i++) {
            const { n, op, pri } = cand[i];
            const sx = n.x * z + cam.x, sy = n.y * z + cam.y;
            const r = Math.max(2, nodeRadius(n) * z);
            let label = n.name || n.id || 'Unknown';
            const maxChars = band === 'macro' ? 14 : 22;
            if (label.length > maxChars) label = label.substring(0, maxChars - 1) + '\u2026';
            const lw = label.length * charW;
            const x0 = sx + r + 6, y0 = sy - charH / 2, x1 = x0 + lw, y1 = sy + charH / 2;
            if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) continue;
            let overlap = false;
            for (let j = 0; j < placed.length; j++) {
                const p = placed[j];
                if (x0 < p.x1 && x1 > p.x0 && y0 < p.y1 && y1 > p.y0) { overlap = true; break; }
            }
            if (overlap) continue;
            placed.push({ x0, y0, x1, y1 });
            labelData.push({ p: [n.x, n.y], t: label, o: op, off: r + 6, bold: pri >= 3 });
        }
        if (!labelData.length) return { layer: null, count: 0 };
        const layer = new lib.TextLayer({
            id: 'labels', data: labelData, pickable: false,
            getPosition: d => d.p, getText: d => d.t,
            getColor: d => [44, 42, 38, Math.min(255, Math.round(d.o * 255))],
            getSize: fontSize, sizeUnits: 'pixels', getPixelOffset: d => [d.off, 0],
            getTextAnchor: 'start', getAlignmentBaseline: 'center',
            getFontWeight: d => d.bold ? 600 : 400, fontFamily: 'Inter, system-ui, sans-serif',
            outlineWidth: 2, outlineColor: [250, 250, 246, 255],
            parameters: { depthTest: false }
        });
        return { layer, count: labelData.length };
    }

    /* Andrew's monotone-chain convex hull. */
    function convexHull(points) {
        if (points.length < 3) return points.slice();
        const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
        const lower = [];
        for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
            lower.push(p);
        }
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
            upper.push(p);
        }
        lower.pop(); upper.pop();
        return lower.concat(upper);
    }

    /* { colorIndex: [{x,y}, ...] } from nodes grouped by categoryColorIndex(fn). */
    function computeHulls(nodes, categoryColorIndex) {
        const groups = {};
        for (const n of nodes) {
            const ci = categoryColorIndex(n.category);
            if (!groups[ci]) groups[ci] = [];
            groups[ci].push({ x: n.x, y: n.y });
        }
        const hulls = {};
        for (const ci in groups) hulls[ci] = convexHull(groups[ci]);
        return hulls;
    }

    /* Paint community silhouettes to an offscreen canvas (created if null).
       Returns { canvas, ctx2d, bounds } — bounds null when no nodes. */
    function renderSilhouettes(canvasEl, ctx2d, communityHulls, COMMUNITY_COLORS, hexToRGBA) {
        if (!canvasEl) { canvasEl = document.createElement('canvas'); ctx2d = canvasEl.getContext('2d'); }
        const count = communityHulls ? Object.keys(communityHulls).length : 0;
        if (!count) { canvasEl.width = 1; canvasEl.height = 1; return { canvas: canvasEl, ctx2d, bounds: null }; }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const ci in communityHulls) {
            for (const p of communityHulls[ci]) {
                if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
            }
        }
        if (minX === Infinity) { canvasEl.width = 1; canvasEl.height = 1; return { canvas: canvasEl, ctx2d, bounds: null }; }
        const pad = 120;
        const bw = Math.max(1, maxX - minX + pad * 2);
        const bh = Math.max(1, maxY - minY + pad * 2);
        canvasEl.width = Math.min(bw, 4000);
        canvasEl.height = Math.min(bh, 4000);
        const sc = ctx2d;
        sc.clearRect(0, 0, canvasEl.width, canvasEl.height);
        const ox = -minX + pad, oy = -minY + pad;
        sc.filter = 'blur(70px)';
        for (const ci in communityHulls) {
            const hull = communityHulls[ci];
            if (!hull || hull.length < 2) continue;
            sc.beginPath();
            sc.moveTo(hull[0].x + ox, hull[0].y + oy);
            for (let i = 1; i < hull.length; i++) sc.lineTo(hull[i].x + ox, hull[i].y + oy);
            sc.closePath();
            sc.fillStyle = hexToRGBA(COMMUNITY_COLORS[ci % COMMUNITY_COLORS.length], 0.08);
            sc.fill();
        }
        sc.filter = 'none';
        return { canvas: canvasEl, ctx2d, bounds: { minX, minY, maxX, maxY, pad, bw, bh } };
    }

    /* Blit the offscreen silhouette into a DOM canvas behind deck, cam-transformed. */
    function drawSilhouetteView(silViewCtx, silViewCanvas, silhouetteCanvas, silBounds, cam, dpr) {
        if (!silViewCtx || !silhouetteCanvas || !silBounds) return;
        silViewCtx.setTransform(1, 0, 0, 1, 0, 0);
        silViewCtx.clearRect(0, 0, silViewCanvas.width, silViewCanvas.height);
        silViewCtx.setTransform(cam.z * dpr, 0, 0, cam.z * dpr, cam.x * dpr, cam.y * dpr);
        silViewCtx.drawImage(silhouetteCanvas, silBounds.minX - silBounds.pad, silBounds.minY - silBounds.pad);
        silViewCtx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /* Render minimap node dots to an offscreen canvas; returns mmBounds. */
    function rebuildMinimapDots(mmDotsCanvas, mmDotsCtx, nodes, getCategoryColor, hexToRGBA, dpr) {
        if (!mmDotsCanvas) return null;
        if (!nodes.length) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) { if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x; if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y; }
        const pad = 10, gw = Math.max(1, maxX - minX + pad * 2), gh = Math.max(1, maxY - minY + pad * 2);
        const s = Math.min(150 / gw, 100 / gh), ox = 80 - (minX + maxX) / 2 * s, oy = 55 - (minY + maxY) / 2 * s;
        mmDotsCtx.setTransform(1, 0, 0, 1, 0, 0);
        mmDotsCtx.clearRect(0, 0, mmDotsCanvas.width, mmDotsCanvas.height);
        mmDotsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const n of nodes) {
            mmDotsCtx.fillStyle = hexToRGBA(getCategoryColor(n.category), 0.6);
            mmDotsCtx.fillRect(n.x * s + ox - 1, n.y * s + oy - 1, 2, 2);
        }
        return { s, ox, oy };
    }

    function drawMinimap(mmCtx, mmDotsCanvas, mmBounds, cam, W, H, hexToRGBA) {
        mmCtx.clearRect(0, 0, 160, 110);
        if (!mmBounds || !mmDotsCanvas) return;
        mmCtx.drawImage(mmDotsCanvas, 0, 0, 160, 110);
        const { s, ox, oy } = mmBounds;
        const vx1 = -cam.x / cam.z, vy1 = -cam.y / cam.z, vx2 = (W - cam.x) / cam.z, vy2 = (H - cam.y) / cam.z;
        mmCtx.strokeStyle = hexToRGBA('#7a7a8a', 0.3); mmCtx.lineWidth = 1;
        mmCtx.strokeRect(vx1 * s + ox, vy1 * s + oy, (vx2 - vx1) * s, (vy2 - vy1) * s);
    }

    window.SocioGraph = {
        GOLDEN_ANGLE, clamp, isFiniteNum,
        rgbOf, catRGB, layoutBounds, applyLayoutToNodes,
        viewStateFromCam, createDeck,
        buildStaticLayers, buildLabelsLayer,
        convexHull, computeHulls, renderSilhouettes,
        drawSilhouetteView, rebuildMinimapDots, drawMinimap
    };
})();
