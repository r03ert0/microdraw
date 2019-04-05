from PIL import Image
import numpy as np
import glob
import pytest
import os
from skimage.measure import compare_mse

cwd = os.path.dirname(os.path.abspath(__file__))
all_test_files = glob.glob(os.path.join(cwd,'*.png'))
@pytest.mark.parametrize('test_file', all_test_files)
def test_images(test_file):
    basename = os.path.basename(test_file)
    reference_file = os.path.join(cwd, 'reference',basename)
    test_data = np.array(Image.open(test_file))
    reference_data = np.array(Image.open(reference_file))
    msg = "{} does not equal {}".format(test_file, reference_file)
    assert compare_mse(test_data, reference_data) < 0.01, msg

