// Pagination
const ALLOWED_LIMITS = [10, 20, 50, 100];

function getPaginationParams(query) {
    let page = parseInt(query.page) || 1;
    let limit = parseInt(query.limit) || 10;

    if (page < 1) page = 1;
    if (!ALLOWED_LIMITS.includes(limit)) limit = 10;

    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

function buildPaginationResponse(data, total, page, limit) {
    return {
        data,
        pageInfo: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

module.exports = { getPaginationParams, buildPaginationResponse, ALLOWED_LIMITS };
