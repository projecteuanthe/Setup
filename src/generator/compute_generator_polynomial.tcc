#include <stddef.h>
#include <vector>
#include <fstream>
#include <math.h>
#include <memory.h>

#include <gmp.h>
#include <time.h>
#include <libff/common/double.hpp>
#include <libfqfft/evaluation_domain/get_evaluation_domain.hpp>

#include <libff/algebra/curves/alt_bn128/alt_bn128_pp.hpp>
#include <libff/algebra/fields/field_utils.hpp>

#include <libfqfft/polynomial_arithmetic/basis_change.hpp>
#include <libfqfft/evaluation_domain/evaluation_domain.hpp>
#include <libfqfft/evaluation_domain/domains/arithmetic_sequence_domain.hpp>

#include <aztec_common/streaming.hpp>

#include "compute_generator_polynomial.hpp"

namespace generator
{
template <typename FieldT, size_t M>
void compute_generator_polynomial()
{
    std::vector<std::vector<std::vector<FieldT>>> subproduct_tree;
    printf("computing the subproduct tree...\n");
    libfqfft::compute_subproduct_tree(log2(M), subproduct_tree);

    std::vector<FieldT> result = subproduct_tree[log2(M)][0];
    printf("result size = %d\n", (int)result.size());
    printf("computed polynomial coefficients, writing to disk...\n");
    streaming::write_field_elements_to_file(result, "./post_processing_db/generator.dat");
}
} // namespace generator
