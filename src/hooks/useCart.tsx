import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>([])

  useEffect(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    setCart(storagedCart ? JSON.parse(storagedCart) : [])
  }, [])
    
  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(cartItem => cartItem.id === productId)

      if (productExists) {
        const productStock = await api.get<Stock>(`stock/${productId}`)
          .then(response => response.data)

        const newAmount = productExists.amount + 1

        if (newAmount <= productStock.amount) {
          await updateProductAmount({productId, amount: newAmount})
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      } else {
        const product = await api.get<Product>(`products/${productId}`)
          .then(response => response.data)

        const newProduct = {
          ...product,
          amount: 1
        }

        const updatedCart = [...cart, newProduct];

        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } 
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(cartItem => cartItem.id === productId);

      if (!productExists) {
        throw new Error('Erro na remoção do produto')
      }

      const updatedCart = cart.filter(cartItem => cartItem.id !== productId)

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch (err) {
      toast.error(err.message)
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock = await api.get<Stock>(`stock/${productId}`)
        .then(response => response.data)

      if (amount < 1) return

      if (amount <= productStock.amount) {
        const updatedCart = cart.map(
          product => product.id === productId
          ? { ...product, amount: amount }
          : product  
        )
  
        setCart(updatedCart)
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        toast.error('Quantidade solicitada fora de estoque')
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
