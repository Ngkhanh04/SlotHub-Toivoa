import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FoodDetailModal from '../components/FoodDetailModal';

/** Deep link /product/:id — hiển thị popup nhỏ, không full màn hình */
const FoodDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <FoodDetailModal
        itemId={id}
        onClose={() => navigate('/')}
        onAddedToCart={() => navigate('/')}
      />
    </div>
  );
};

export default FoodDetail;
